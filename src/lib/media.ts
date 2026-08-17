// Provider-neutral poster delivery URLs. The new runtime's DB stores provider-
// neutral public IDs + versions; until the R2 phase lands these still resolve
// through Cloudinary's delivery network, with the cloud name read from the
// runtime env (VITE_CLOUDINARY_CLOUD_NAME). The `http` pass-through covers the
// legacy rows that store a full delivery URL instead of a bare public ID.
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

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
  const transforms = `c_fill${width ? `,w_${width}` : ""}${height ? `,h_${height}` : ""}${gravity ? `,g_${gravity}` : ""},q_auto,f_${format ?? "auto"}`;
  const path = version ? `v${version}/${publicId}` : publicId;
  if (!CLOUD_NAME) return path;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${path}`;
}
