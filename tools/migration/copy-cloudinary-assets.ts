import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readJsonIfExists, writeJsonAtomic } from "./media-manifest";
import type { CloudinaryManifest, CloudinaryManifestAsset } from "./inventory-cloudinary";

export interface CopyManifestOptions {
  manifestPath: string;
  objectRoot: string;
  maxBytes: number;
  timeoutMilliseconds: number;
  fetchImplementation?: typeof fetch;
}

function destinationPath(asset: CloudinaryManifestAsset, objectRoot: string) {
  return resolve(objectRoot, asset.destinationKey);
}

async function download(
  asset: CloudinaryManifestAsset,
  options: CopyManifestOptions,
) {
  if (!asset.sourceUrl) throw new Error("Asset has no source URL");
  const response = await (options.fetchImplementation ?? fetch)(asset.sourceUrl, {
    signal: AbortSignal.timeout(options.timeoutMilliseconds),
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes) {
    throw new Error(`Asset exceeds ${options.maxBytes} byte limit`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > options.maxBytes) {
    throw new Error(`Asset exceeds ${options.maxBytes} byte limit`);
  }
  if (asset.bytes !== null && asset.bytes !== bytes.byteLength) {
    throw new Error(`Byte length mismatch: expected ${asset.bytes}, got ${bytes.byteLength}`);
  }
  return {
    bytes,
    checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function copyAsset(asset: CloudinaryManifestAsset, options: CopyManifestOptions) {
  const downloaded = await download(asset, options);
  const path = destinationPath(asset, options.objectRoot);
  const temporaryPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, downloaded.bytes);
  await rename(temporaryPath, path);
  return downloaded.checksum;
}

export async function copyManifest(
  manifest: CloudinaryManifest,
  options: CopyManifestOptions,
) {
  for (const asset of manifest.assets) {
    if (asset.status === "copied") continue;
    try {
      asset.copiedChecksum = await copyAsset(asset, options);
      asset.status = "copied";
      asset.copiedAt = new Date().toISOString();
      asset.copyError = null;
    } catch (error) {
      asset.status = "failed";
      asset.copyError = error instanceof Error ? error.message : String(error);
    }
    await writeJsonAtomic(options.manifestPath, manifest);
  }

  return manifest.assets.filter((asset) => asset.status === "failed");
}

async function main() {
  const options: CopyManifestOptions = {
    manifestPath: resolve(
      process.env.MEDIA_MANIFEST_PATH ?? "data/migration/cloudinary/manifest.json",
    ),
    objectRoot: resolve(process.env.OBJECT_STORE_PATH ?? "data/objects"),
    maxBytes: Number(process.env.MEDIA_MAX_BYTES ?? 100 * 1024 * 1024),
    timeoutMilliseconds: Number(process.env.MEDIA_TIMEOUT_MS ?? 30_000),
  };
  const manifest = await readJsonIfExists<CloudinaryManifest>(options.manifestPath);
  if (!manifest) throw new Error(`Media manifest not found: ${options.manifestPath}`);

  const failed = await copyManifest(manifest, options);
  console.log(
    JSON.stringify({
      message: failed.length ? "Cloudinary asset copy incomplete" : "Cloudinary asset copy complete",
      copied: manifest.assets.filter((asset) => asset.status === "copied").length,
      failed: failed.length,
      manifestPath: options.manifestPath,
      objectRoot: options.objectRoot,
    }),
  );
  if (failed.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
