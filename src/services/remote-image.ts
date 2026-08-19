const ALLOWED_HOST = "images.justwatch.com";
export const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;
export const REMOTE_IMAGE_TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;

const imageTypes = new Map([
  ["image/jpeg", { extension: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ["image/png", { extension: "png", signature: (bytes: Uint8Array) => bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]) }],
  ["image/gif", { extension: "gif", signature: (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 6)) === "GIF87a" || new TextDecoder().decode(bytes.slice(0, 6)) === "GIF89a" }],
  ["image/webp", { extension: "webp", signature: (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" }],
]);

export function validateJustWatchImageUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid image URL");
  }
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Image URL is not allowed");
  }
  return url;
}

export function sniffImage(bytes: Uint8Array, contentType: string | null) {
  const normalizedType = contentType?.split(";", 1)[0].trim().toLowerCase();
  const match = normalizedType ? imageTypes.get(normalizedType) : undefined;
  if (!match || !match.signature(bytes)) throw new Error("Response is not a supported image");
  return { mimeType: normalizedType!, extension: match.extension };
}

async function readLimited(response: Response): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error("Image exceeds the size limit");
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_REMOTE_IMAGE_BYTES) throw new Error("Image exceeds the size limit");
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REMOTE_IMAGE_BYTES) throw new Error("Image exceeds the size limit");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export async function fetchJustWatchImage(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<{ bytes: Uint8Array; mimeType: string; extension: string }> {
  let url = validateJustWatchImageUrl(value);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetcher(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(REMOTE_IMAGE_TIMEOUT_MS),
      headers: { Accept: "image/jpeg,image/png,image/webp,image/gif" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === MAX_REDIRECTS) throw new Error("Too many image redirects");
      url = validateJustWatchImageUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Image server responded with ${response.status}`);
    const bytes = await readLimited(response);
    return { bytes, ...sniffImage(bytes, response.headers.get("content-type")) };
  }
  throw new Error("Image request failed");
}
