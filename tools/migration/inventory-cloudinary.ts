import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { requireEnvironment } from "./environment";
import { readJsonIfExists, writeJsonAtomic } from "./media-manifest";

const outputPath = resolve("data/migration/cloudinary/manifest.json");
const pageSize = 500;

export interface CloudinaryResource {
  public_id: string;
  asset_folder?: string;
  version: number;
  format: string;
  resource_type: string;
  type: string;
  width?: number;
  height?: number;
  bytes?: number;
  asset_id?: string;
  etag?: string;
  created_at?: string;
  secure_url?: string;
}

export interface CloudinaryManifestAsset {
  publicId: string;
  assetFolder: string | null;
  version: number;
  format: string;
  mimeType: string;
  resourceType: string;
  deliveryType: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  assetId: string | null;
  etag: string | null;
  createdAt: string | null;
  sourceUrl: string | null;
  destinationKey: string;
  status: "pending";
}

export interface CloudinaryManifest {
  generatedAt: string;
  pageSize: number;
  complete: boolean;
  nextCursor: string | null;
  assets: CloudinaryManifestAsset[];
}

export function destinationKey(resource: Pick<CloudinaryResource, "public_id" | "version" | "format">) {
  return `media/${resource.public_id}/v${resource.version}.${resource.format}`;
}

export function normalizeResource(resource: CloudinaryResource): CloudinaryManifestAsset {
  return {
    publicId: resource.public_id,
    assetFolder: resource.asset_folder ?? null,
    version: resource.version,
    format: resource.format,
    mimeType: `image/${resource.format === "jpg" ? "jpeg" : resource.format}`,
    resourceType: resource.resource_type,
    deliveryType: resource.type,
    width: resource.width ?? null,
    height: resource.height ?? null,
    bytes: resource.bytes ?? null,
    assetId: resource.asset_id ?? null,
    etag: resource.etag ?? null,
    createdAt: resource.created_at ?? null,
    sourceUrl: resource.secure_url ?? null,
    destinationKey: destinationKey(resource),
    status: "pending",
  };
}

async function fetchPage(
  cloudName: string,
  credentials: string,
  nextCursor: string | null,
) {
  const url = new URL(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload`,
  );
  url.searchParams.set("max_results", String(pageSize));
  if (nextCursor) url.searchParams.set("next_cursor", nextCursor);

  const response = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!response.ok) {
    throw new Error(`Cloudinary inventory failed with status ${response.status}`);
  }
  return (await response.json()) as {
    resources: CloudinaryResource[];
    next_cursor?: string;
  };
}

async function main() {
  const cloudName = requireEnvironment("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnvironment("CLOUDINARY_API_KEY");
  const apiSecret = requireEnvironment("CLOUDINARY_API_SECRET");
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const previous = await readJsonIfExists<CloudinaryManifest>(outputPath);
  const manifest: CloudinaryManifest = previous ?? {
    generatedAt: new Date().toISOString(),
    pageSize,
    complete: false,
    nextCursor: null,
    assets: [],
  };

  if (!manifest.complete) {
    const known = new Set(
      manifest.assets.map(
        (asset) => asset.assetId ?? `${asset.publicId}:${asset.version}`,
      ),
    );
    let cursor = manifest.nextCursor;

    do {
      const page = await fetchPage(cloudName, credentials, cursor);
      for (const resource of page.resources) {
        const identity =
          resource.asset_id ?? `${resource.public_id}:${resource.version}`;
        if (!known.has(identity)) {
          manifest.assets.push(normalizeResource(resource));
          known.add(identity);
        }
      }
      cursor = page.next_cursor ?? null;
      manifest.nextCursor = cursor;
      manifest.generatedAt = new Date().toISOString();
      await writeJsonAtomic(outputPath, manifest);
    } while (cursor);

    manifest.complete = true;
    await writeJsonAtomic(outputPath, manifest);
  }

  console.log(
    JSON.stringify({
      message: "Cloudinary inventory complete",
      assetCount: manifest.assets.length,
      outputPath,
    }),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
