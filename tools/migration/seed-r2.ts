import { access, readdir } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { spawn } from "node:child_process";

const args = new Set(process.argv.slice(2));
const remote = args.has("--remote");
const local = args.has("--local") || !remote;
if (remote && local) throw new Error("Choose only --local or --remote");

const source = resolve(process.env.OBJECT_STORE_PATH ?? "data/objects");
const bucket = process.env.R2_BUCKET ?? "nollywood-film-club-media";
await access(source);

async function filesIn(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else files.push(path);
  }
  return files;
}

const files = await filesIn(source);
if (!files.length) throw new Error(`No objects found under ${source}`);

function contentType(path: string) {
  return ({
    ".avif": "image/avif", ".gif": "image/gif", ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg", ".pdf": "application/pdf", ".png": "image/png",
    ".svg": "image/svg+xml", ".webp": "image/webp",
  } as Record<string, string>)[extname(path).toLowerCase()] ?? "application/octet-stream";
}

async function upload(path: string) {
  const key = relative(source, path).replaceAll("\\", "/");
  const command = [
    "bunx", "wrangler", "r2", "object", "put", `${bucket}/${key}`,
    "--file", path, local ? "--local" : "--remote", "--force",
    "--content-type", contentType(path),
  ].join(" ");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", command], {
      stdio: "ignore", env: process.env,
    });
    const code = await new Promise<number>((resolvePromise, reject) => {
      child.once("error", reject);
      child.once("exit", (exitCode) => resolvePromise(exitCode ?? 1));
    });
    if (code === 0) return;
    if (attempt < 5) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
  }
  throw new Error(`R2 upload failed for ${key}`);
}

// Local R2 serializes writes internally; a small pool plus retries avoids lock
// failures while keeping large imports practical.
const concurrency = local ? 4 : 8;
for (let offset = 0; offset < files.length; offset += concurrency) {
  await Promise.all(files.slice(offset, offset + concurrency).map(upload));
}

console.log(JSON.stringify({ seeded: true, mode: local ? "local-r2" : "remote-r2", bucket, objects: files.length }));
