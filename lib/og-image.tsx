import { ImageResponse } from "next/og";
import { resolveContent } from "@/lib/content-route";

// Shared generator behind the opengraph-image.tsx files of /movie/[slug],
// /tv/[slug] and /short/[slug] — the poster full-bleed with the NFC badge
// in the bottom-right corner. The badge is drawn in JSX (colours sampled
// from public/assets/webp/logo-no-bg.webp) because satori can't decode webp.

export const OG_SIZE = { width: 1200, height: 630 };

interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 300 | 400 | 600 | 700;
  style: "normal";
}

// satori can't parse woff2 — fetching Google Fonts CSS without a browser
// User-Agent returns plain TTF urls. Cached across requests per instance.
let fontsPromise: Promise<OgFont[]> | null = null;

function loadFonts(): Promise<OgFont[]> {
  fontsPromise ??= (async () => {
    try {
      const css = await fetch(
        "https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@300;400;600;700",
        { headers: { "User-Agent": "curl/8" } },
      ).then((r) => r.text());

      const faces = css
        .split("@font-face")
        .slice(1)
        .map((block) => ({
          weight: Number(block.match(/font-weight:\s*(\d+)/)?.[1]),
          url: block.match(/src:\s*url\((.+?)\)/)?.[1],
        }))
        .filter(
          (f): f is { weight: 300 | 400 | 600 | 700; url: string } =>
            !!f.url && [300, 400, 600, 700].includes(f.weight),
        );

      return await Promise.all(
        faces.map(async (f) => ({
          name: "Lexend Deca",
          data: await fetch(f.url).then((r) => r.arrayBuffer()),
          weight: f.weight,
          style: "normal" as const,
        })),
      );
    } catch (error) {
      // Fall back to ImageResponse's built-in default font
      console.error("OG image font load failed:", error);
      return [];
    }
  })();
  return fontsPromise;
}

// The circular NFC badge, recreated from the logo (pink #d1416d, grey ring)
function NfcBadge({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        backgroundColor: "#d1416d",
        border: `${Math.round(size * 0.04)}px solid #c6c6c6`,
        color: "#ffffff",
        fontSize: size * 0.17,
        fontWeight: 600,
        lineHeight: 1.25,
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex" }}>Nollywood</div>
      <div style={{ display: "flex" }}>Film Club</div>
    </div>
  );
}

export async function contentOgImage(rawSlug: string) {
  const [item, fonts] = await Promise.all([
    resolveContent(rawSlug),
    loadFonts(),
  ]);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  // f_jpg because satori doesn't decode webp/avif; g_auto so the landscape
  // crop of the portrait poster keeps the subject in frame
  const posterUrl =
    item?.posterImage && cloudName
      ? `https://res.cloudinary.com/${cloudName}/image/upload/f_jpg,c_fill,g_auto,w_${OG_SIZE.width},h_${OG_SIZE.height}/${item.posterImage}`
      : null;

  const fontFamily = fonts.length ? "Lexend Deca" : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#000000",
          fontFamily,
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
    {
      ...OG_SIZE,
      fonts: fonts.length ? fonts : undefined,
    },
  );
}
