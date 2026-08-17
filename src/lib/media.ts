// Provider-neutral media URLs. Transform intent is applied by the media route
// rather than leaking a storage provider into application components.

export interface PosterUrlOptions {
  version?: number | null;
  width?: number;
  height?: number;
  format?: "jpeg" | "webp" | "jpg";
  gravity?: "auto";
}

export function posterUrl(
  publicId: string,
  { version, width, height, format, gravity }: PosterUrlOptions = {},
): string {
  if (publicId.startsWith("http") || publicId.startsWith("/media/")) {
    return publicId;
  }
  void width; void height; void format; void gravity;
  return `/media/${version ? `media/${publicId}/v${version}` : publicId}`;
}
