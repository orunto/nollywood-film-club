import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function checksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function writeTextAtomic(path: string, value: string) {
  const temporaryPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, value);
  await rename(temporaryPath, path);
}

export async function writeJsonAtomic(path: string, value: unknown) {
  await writeTextAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}
