import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "#resvg-wasm";
import { NFC_LOGO_SVG } from "../lib/nfc-logo";
import type { PublicReadRepository } from "../repositories/public-read";
import { resolveContent } from "./content-detail";
import { posterUrl } from "../lib/media";

export const OG_SIZE = { width: 1200, height: 630 };

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

// Shared generator behind the OG routes of /movie/:slug, /tv/:slug and
// /short/:slug — the poster full-bleed with the NFC badge in the bottom-right
// corner. When the poster can't be resolved the badge is centered on black.
// Mirrors lib/og-image.tsx on the legacy side.
export async function contentOgImage(
  repository: PublicReadRepository,
  rawSlug: string,
  request?: Request,
): Promise<Response> {
  const item = await resolveContent(repository, rawSlug);

  let posterDataUri: string | null = null;
  if (item?.posterImage && request) {
    try {
      const src = posterUrl(item.posterImage, {
        version: item.posterVersion ?? undefined,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
        format: "jpg",
        gravity: "auto",
      });
      const url = new URL(src, request.url);
      if (url.protocol === "http:" || url.protocol === "https:") {
        const res = await fetch(url);
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          const contentType = res.headers.get("content-type") ?? "image/jpeg";
          posterDataUri = `data:${contentType};base64,${bytesToBase64(bytes)}`;
        }
      }
    } catch {
      // Fall back to the badge-only layout.
    }
  }

  const png = await svgToPng(svgFor(posterDataUri));
  return new Response(png as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}