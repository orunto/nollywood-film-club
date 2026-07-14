import { ImageResponse } from "next/og";
import { resolveContent } from "@/lib/content-route";
import { NFC_LOGO_SVG } from "@/lib/nfc-logo";

// Shared generator behind the opengraph-image.tsx files of /movie/[slug],
// /tv/[slug] and /short/[slug] — the poster full-bleed with the NFC badge
// in the bottom-right corner. The badge is the vector logo (text as paths)
// embedded as a data URI, since satori can't decode the webp logo asset.

export const OG_SIZE = { width: 1200, height: 630 };

const NFC_LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(NFC_LOGO_SVG).toString("base64")}`;

// The circular NFC badge, rendered from the vector logo
function NfcBadge({ size }: { size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={NFC_LOGO_DATA_URI} alt="" width={size} height={size} />
  );
}

export async function contentOgImage(rawSlug: string) {
  const item = await resolveContent(rawSlug);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  // f_jpg because satori doesn't decode webp/avif; g_auto so the landscape
  // crop of the portrait poster keeps the subject in frame
  const posterUrl =
    item?.posterImage && cloudName
      ? `https://res.cloudinary.com/${cloudName}/image/upload/f_jpg,c_fill,g_auto,w_${OG_SIZE.width},h_${OG_SIZE.height}/${item.posterImage}`
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
        {posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
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
        {posterUrl ? (
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
