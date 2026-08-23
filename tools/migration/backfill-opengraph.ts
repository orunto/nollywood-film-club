import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { contentOpenGraphObjectKey } from "../../src/lib/media";
import { readJsonIfExists, writeJsonAtomic } from "./media-manifest";

const BASE_URL = process.env.OG_BACKFILL_BASE_URL ?? "https://nollywoodfilm.club";
const DATABASE = process.env.D1_DATABASE ?? "nollywood-film-club-production";
const BUCKET = process.env.R2_BUCKET ?? "nollywood-film-club-media-production";
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
      const response = await fetch(new URL(routePath(row), BASE_URL), {
        headers: { "User-Agent": "NFC OpenGraph Backfill/1.0" },
      });
      if (!response.ok) {
        throw new Error(`Generator returned ${response.status}`);
      }
      if (response.headers.get("content-type")?.split(";", 1)[0] !== "image/jpeg") {
        throw new Error("Generator did not return JPEG; deploy the write-time generator first");
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      const file = join(directory, `${row.id}.jpg`);
      await writeFile(file, bytes);
      const objectKey = contentOpenGraphObjectKey(row.id);
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
