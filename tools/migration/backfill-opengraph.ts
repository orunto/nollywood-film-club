import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { contentOpenGraphObjectKey } from "../../src/lib/media";
import { readJsonIfExists, writeJsonAtomic } from "./media-manifest";

const BASE_URL = process.env.OG_BACKFILL_BASE_URL ?? "https://nollywoodfilm.club";
const DATABASE = process.env.D1_DATABASE ?? "nollywood-film-club";
const BUCKET = process.env.R2_BUCKET ?? "nollywood-film-club-media";
const CHECKPOINT = resolve("data/migration/opengraph-backfill.json");
const force = process.argv.includes("--force");
const wranglerBin = resolve("node_modules/wrangler/bin/wrangler.js");

interface ContentRow {
  id: string;
  content_type: "movie" | "tv_show" | "short_film";
}

interface Checkpoint {
  completed: string[];
  failures: Record<string, string>;
}

async function wrangler(args: string[], capture = false): Promise<string> {
  const child = spawn(process.execPath, [wranglerBin, ...args], {
    env: process.env,
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });
  let output = "";
  if (capture && child.stdout) {
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
    });
  }
  const code = await new Promise<number>((resolveCode, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode) => resolveCode(exitCode ?? 1));
  });
  if (code !== 0) throw new Error(`Wrangler exited with code ${code}`);
  return output;
}

async function contentRows(): Promise<ContentRow[]> {
  const output = await wrangler([
    "d1",
    "execute",
    DATABASE,
    "--remote",
    "--json",
    "--command",
    "SELECT id, content_type FROM content ORDER BY created_at",
  ], true);
  const parsed = JSON.parse(output) as Array<{ results?: ContentRow[] }>;
  const rows = parsed.flatMap((result) => result.results ?? []);
  if (!rows.length) throw new Error(`No content found in remote D1 database ${DATABASE}`);
  return rows;
}

function routePath(row: ContentRow): string {
  const base = {
    movie: "movie",
    tv_show: "tv",
    short_film: "short",
  }[row.content_type];
  return `/${base}/${row.id}/opengraph-image`;
}

const delay = (milliseconds: number) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function fetchImage(row: ContentRow): Promise<Uint8Array> {
  const url = new URL(routePath(row), BASE_URL);
  for (let attempt = 1; attempt <= 6; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "NFC OpenGraph Backfill/1.0" },
      });
    } catch (error) {
      if (attempt === 6) throw error;
      const delayMs = attempt * 10_000;
      console.warn(JSON.stringify({ contentId: row.id, error: "fetch failed", attempt, delayMs }));
      await delay(delayMs);
      continue;
    }
    if (response.ok) {
      if (response.headers.get("content-type")?.split(";", 1)[0] !== "image/jpeg") {
        throw new Error("Generator did not return JPEG; deploy the write-time generator first");
      }
      return new Uint8Array(await response.arrayBuffer());
    }
    if ((response.status !== 429 && response.status !== 503) || attempt === 6) {
      throw new Error(`Generator returned ${response.status}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1_000
      : attempt * 10_000;
    console.warn(JSON.stringify({ contentId: row.id, status: response.status, attempt, delayMs }));
    await delay(delayMs);
  }
  throw new Error("Generator retries exhausted");
}

async function uploadImage(file: string, objectKey: string): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await wrangler([
        "r2",
        "object",
        "put",
        `${BUCKET}/${objectKey}`,
        "--file",
        file,
        "--remote",
        "--force",
        "--content-type",
        "image/jpeg",
        "--cache-control",
        "public, max-age=31536000, immutable",
      ]);
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      const delayMs = attempt * 10_000;
      console.warn(JSON.stringify({ objectKey, error: "upload failed", attempt, delayMs }));
      await delay(delayMs);
    }
  }
}

const checkpoint = await readJsonIfExists<Checkpoint>(CHECKPOINT) ?? {
  completed: [],
  failures: {},
};
const completed = new Set(force ? [] : checkpoint.completed);
const directory = await mkdtemp(join(tmpdir(), "nfc-opengraph-"));

try {
  const rows = await contentRows();
  for (const [index, row] of rows.entries()) {
    if (completed.has(row.id)) continue;
    try {
      const bytes = await fetchImage(row);
      const file = join(directory, `${row.id}.jpg`);
      await writeFile(file, bytes);
      const objectKey = contentOpenGraphObjectKey(row.id);
      await uploadImage(file, objectKey);

      completed.add(row.id);
      delete checkpoint.failures[row.id];
      checkpoint.completed = [...completed];
      await writeJsonAtomic(CHECKPOINT, checkpoint);
      console.log(JSON.stringify({
        progress: `${index + 1}/${rows.length}`,
        contentId: row.id,
        objectKey,
        bytes: bytes.byteLength,
      }));
    } catch (error) {
      checkpoint.failures[row.id] = error instanceof Error ? error.message : String(error);
      checkpoint.completed = [...completed];
      await writeJsonAtomic(CHECKPOINT, checkpoint);
      console.error(JSON.stringify({ contentId: row.id, error: checkpoint.failures[row.id] }));
    }
  }

  console.log(JSON.stringify({
    complete: checkpoint.completed.length,
    failed: Object.keys(checkpoint.failures).length,
    database: DATABASE,
    bucket: BUCKET,
  }));
  if (Object.keys(checkpoint.failures).length > 0) process.exitCode = 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
