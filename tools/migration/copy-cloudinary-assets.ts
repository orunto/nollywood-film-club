import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readJsonIfExists, writeJsonAtomic } from "./media-manifest";
import type { CloudinaryManifest, CloudinaryManifestAsset } from "./inventory-cloudinary";

const manifestPath = resolve(
  process.env.MEDIA_MANIFEST_PATH ?? "data/migration/cloudinary/manifest.json",
);
const objectRoot = resolve(process.env.OBJECT_STORE_PATH ?? "data/objects");
const maxBytes = Number(process.env.MEDIA_MAX_BYTES ?? 100 * 1024 * 1024);
const timeoutMilliseconds = Number(process.env.MEDIA_TIMEOUT_MS ?? 30_000);

function destinationPath(asset: CloudinaryManifestAsset) {
  return resolve(objectRoot, asset.destinationKey);
}

async function download(asset: CloudinaryManifestAsset) {
  if (!asset.sourceUrl) throw new Error("Asset has no source URL");
  const response = await fetch(asset.sourceUrl, {
    signal: AbortSignal.timeout(timeoutMilliseconds),
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`Asset exceeds ${maxBytes} byte limit`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error(`Asset exceeds ${maxBytes} byte limit`);
  if (asset.bytes !== null && asset.bytes !== bytes.byteLength) {
    throw new Error(`Byte length mismatch: expected ${asset.bytes}, got ${bytes.byteLength}`);
  }
  return {
    bytes,
    checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function copyAsset(asset: CloudinaryManifestAsset) {
  const downloaded = await download(asset);
  const path = destinationPath(asset);
  const temporaryPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, downloaded.bytes);
  await rename(temporaryPath, path);
  return downloaded.checksum;
}

const manifest = await readJsonIfExists<CloudinaryManifest>(manifestPath);
if (!manifest) throw new Error(`Media manifest not found: ${manifestPath}`);

for (const asset of manifest.assets) {
  if (asset.status === "copied") continue;
  try {
    asset.copiedChecksum = await copyAsset(asset);
    asset.status = "copied";
    asset.copiedAt = new Date().toISOString();
    asset.copyError = null;
  } catch (error) {
    asset.status = "failed";
    asset.copyError = error instanceof Error ? error.message : String(error);
  }
  await writeJsonAtomic(manifestPath, manifest);
}

const failed = manifest.assets.filter((asset) => asset.status === "failed");
console.log(
  JSON.stringify({
    message: failed.length ? "Cloudinary asset copy incomplete" : "Cloudinary asset copy complete",
    copied: manifest.assets.filter((asset) => asset.status === "copied").length,
    failed: failed.length,
    manifestPath,
    objectRoot,
  }),
);
if (failed.length) process.exitCode = 1;
