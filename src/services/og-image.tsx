import { ImageResponse } from "@vercel/og";
import { NFC_LOGO_SVG } from "../lib/nfc-logo";
import type { PublicReadRepository } from "../repositories/public-read";
import { resolveContent } from "./content-detail";
import { posterUrl } from "../lib/media";

export const OG_SIZE = { width: 1200, height: 630 };
export const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

const NFC_LOGO_DATA_URI = `data:image/svg+xml;base64,${btoa(NFC_LOGO_SVG)}`;

// The circular NFC badge, rendered from the vector logo
function NfcBadge({ size }: { size: number }) {
  return <img src={NFC_LOGO_DATA_URI} alt="" width={size} height={size} />;
}

// Shared generator behind the OG routes of /movie/:slug, /tv/:slug and
// /short/:slug — the poster full-bleed with the NFC badge in the bottom-right
// corner. The badge is the vector logo (text as paths) embedded as a data URI,
// since satori can't decode the webp logo asset. f_jpg because satori doesn't
// decode webp/avif; g_auto keeps the landscape crop of the portrait poster in
// frame. Mirrors lib/og-image.tsx on the legacy side.
export async function contentOgImage(
  repository: PublicReadRepository,
  rawSlug: string,
): Promise<Response> {
  const item = await resolveContent(repository, rawSlug);

  // f_jpg (satori can't decode webp/avif) + g_auto (keeps the subject of the
  // portrait poster in the landscape frame) via posterUrl. Only render the
  // poster when an absolute URL is produced — without the configured cloud name
  // posterUrl falls back to a bare path, which satori can't fetch.
  const src =
    item?.posterImage && CLOUD_NAME
      ? posterUrl(item.posterImage, {
          version: item.posterVersion ?? undefined,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          format: "jpg",
          gravity: "auto",
        })
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#000000",
        }}
      >
        {src && (
          <img
            src={src}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        {src ? (
          <div style={{ position: "absolute", right: 40, bottom: 40, display: "flex" }}>
            <NfcBadge size={160} />
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NfcBadge size={320} />
          </div>
        )}
      </div>
    ),
    OG_SIZE,
  );
}