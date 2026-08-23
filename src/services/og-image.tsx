import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "#resvg-wasm";
import { NFC_LOGO_SVG } from "../lib/nfc-logo";
import { contentOpenGraphObjectKey, mediaObjectKey } from "../lib/media";
import type { PublicReadRepository } from "../repositories/public-read";
import type { ImageTransformer, ObjectStore } from "./contracts";
import { resolveContent } from "./content-detail";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/jpeg";

// The badge is the vector logo (text as paths) inlined as a nested <svg>, so
// no font loading is needed at runtime — @vercel/og's font fetch is what broke
// under workerd (new URL("./Geist-Regular.ttf", import.meta.url) throws).
const NFC_LOGO_INNER = NFC_LOGO_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  wasmReady ??= initWasm(resvgWasm);
  return wasmReady;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function svgFor(posterDataUri: string | null): string {
  const { width, height } = OG_SIZE;
  const poster = posterDataUri
    ? `<image href="${posterDataUri}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const badge = posterDataUri
    ? { size: 160, x: width - 40 - 160, y: height - 40 - 160 }
    : { size: 320, x: (width - 320) / 2, y: (height - 320) / 2 };
  const badgeSvg = `<svg x="${badge.x}" y="${badge.y}" width="${badge.size}" height="${badge.size}" viewBox="0 0 300 300">${NFC_LOGO_INNER}</svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#000000"/>${poster}${badgeSvg}</svg>`;
}

async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const resvg = new Resvg(svg, { fitTo: { mode: "original" } });
  const png = resvg.render().asPng();
  resvg.free();
  return png;
}

async function renderContentOgImage(
  objects: ObjectStore,
  images: ImageTransformer,
  posterImage: string | null | undefined,
): Promise<ArrayBuffer> {
  let posterDataUri: string | null = null;
  const objectKey = mediaObjectKey(posterImage);
  if (objectKey) {
    const object = await objects.get(objectKey);
    if (object) {
      const transformed = await images.transform(object.body, {
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        fit: "cover",
        format: "jpeg",
      });
      if (!transformed.ok) {
        throw new Error(`Poster transformation failed with status ${transformed.status}`);
      }
      const bytes = new Uint8Array(await transformed.arrayBuffer());
      posterDataUri = `data:image/jpeg;base64,${bytesToBase64(bytes)}`;
    }
  }

  const png = await svgToPng(svgFor(posterDataUri));
  const pngBuffer = new Uint8Array(png).buffer;
  const jpeg = await images.transform(
    new Blob([pngBuffer], { type: "image/png" }).stream(),
    {
      width: OG_SIZE.width,
      height: OG_SIZE.height,
      fit: "contain",
      format: "jpeg",
    },
  );
  if (!jpeg.ok) {
    throw new Error(`Open Graph image encoding failed with status ${jpeg.status}`);
  }
  return jpeg.arrayBuffer();
}

export async function generateAndStoreContentOgImage(
  objects: ObjectStore,
  images: ImageTransformer,
  content: {
    id: string;
    posterImage?: string | null;
    posterObjectKey?: string | null;
  },
): Promise<string> {
  const bytes = await renderContentOgImage(
    objects,
    images,
    content.posterObjectKey ?? content.posterImage,
  );
  const objectKey = contentOpenGraphObjectKey(content.id);
  await objects.put(objectKey, bytes, {
    contentType: OG_CONTENT_TYPE,
    contentLength: bytes.byteLength,
    cacheControl: "public, max-age=31536000, immutable",
  });
  return objectKey;
}

// Shared generator behind the OG routes of /movie/:slug, /tv/:slug and
// /short/:slug — the poster full-bleed with the NFC badge in the bottom-right
// corner. When the poster can't be resolved the badge is centered on black.
// Mirrors lib/og-image.tsx on the legacy side.
export async function contentOgImage(
  repository: PublicReadRepository,
  objects: ObjectStore,
  images: ImageTransformer,
  rawSlug: string,
): Promise<Response> {
  const item = await resolveContent(repository, rawSlug);
  const jpeg = await renderContentOgImage(objects, images, item?.posterImage);
  return new Response(jpeg, {
    headers: {
      "Content-Type": OG_CONTENT_TYPE,
      "Content-Length": String(jpeg.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
