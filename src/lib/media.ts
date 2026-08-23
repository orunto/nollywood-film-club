// Provider-neutral media URLs. Transform intent is applied by the media route
// rather than leaking a storage provider into application components.

export interface PosterUrlOptions {
  version?: number | null;
  width?: number;
  height?: number;
  format?: "jpeg" | "webp" | "jpg";
  gravity?: "auto";
}

const CATALOG_MEDIA_PREFIX = "/media/media/nfc/";

export function contentOpenGraphObjectKey(contentId: string): string {
  return `opengraph/content/${contentId}.jpg`;
}

export function isCatalogPosterUrl(value: string | null | undefined): value is string {
  return value?.startsWith(CATALOG_MEDIA_PREFIX) === true;
}

export function mediaObjectKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/media/media/")) return value.slice("/media/".length);
  if (value.startsWith("media/")) return value;
  return null;
}

export function catalogPosterIdentity(
  catalog: string,
  extension: string,
  version = Date.now(),
) {
  const name = catalog
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  if (!name) throw new Error("A catalog title is required before uploading a poster");

  const publicId = `nfc/${name}`;
  return {
    objectKey: `media/${publicId}/v${version}.${extension}`,
    publicId,
    version,
  };
}

export function posterUrl(
  publicId: string,
  { version, width, height, format, gravity }: PosterUrlOptions = {},
): string {
  if (publicId.startsWith("http") || publicId.startsWith("/media/")) {
    return publicId;
  }
  if (publicId.startsWith("media/")) return `/media/${publicId}`;
  void width; void height; void format; void gravity;
  return `/media/${version ? `media/${publicId}/v${version}` : publicId}`;
}
