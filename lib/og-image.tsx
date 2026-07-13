import { ImageResponse } from "next/og";
import { resolveContent } from "@/lib/content-route";
import { contentTypeLabel } from "@/lib/utils";

// Shared generator behind the opengraph-image.tsx files of /movie/[slug],
// /tv/[slug] and /short/[slug] — a monochrome NFC-branded card with the
// poster alongside the title, per the site's flat black/white design system.

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

export async function contentOgImage(rawSlug: string) {
  const [item, fonts] = await Promise.all([
    resolveContent(rawSlug),
    loadFonts(),
  ]);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  // f_jpg because satori doesn't decode webp/avif
  const posterUrl =
    item?.posterImage && cloudName
      ? `https://res.cloudinary.com/${cloudName}/image/upload/f_jpg,c_fill,w_400,h_600/${item.posterImage}`
      : null;

  const year = item?.releaseDate
    ? new Date(item.releaseDate).getUTCFullYear()
    : null;
  const title = item?.title ?? "Nollywood Film Club";
  const fontFamily = fonts.length ? "Lexend Deca" : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily,
          padding: 48,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 6,
              borderBottom: "3px solid #000",
              paddingBottom: 20,
            }}
          >
            NOLLYWOOD FILM CLUB
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 40 ? 52 : 68,
                fontWeight: 700,
                lineHeight: 1.1,
                lineClamp: 3,
              }}
            >
              {title}
            </div>
            {item && (
              <div style={{ display: "flex", gap: 14 }}>
                {year && (
                  <div
                    style={{
                      display: "flex",
                      border: "2px solid #000",
                      borderRadius: 4,
                      padding: "8px 18px",
                      fontSize: 26,
                      fontWeight: 400,
                    }}
                  >
                    {year}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    border: "2px solid #000",
                    borderRadius: 4,
                    padding: "8px 18px",
                    fontSize: 26,
                    fontWeight: 400,
                  }}
                >
                  {contentTypeLabel(item.contentType)}
                </div>
                {item.rating && (
                  <div
                    style={{
                      display: "flex",
                      backgroundColor: "#000",
                      color: "#fff",
                      borderRadius: 4,
                      padding: "8px 18px",
                      fontSize: 26,
                      fontWeight: 400,
                    }}
                  >
                    {item.rating}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", fontSize: 24, fontWeight: 300 }}>
            {item?.genre?.length
              ? item.genre
                  .slice(0, 3)
                  .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
                  .join(" · ")
              : "Nigerian cinema, watched and discussed together"}
          </div>
        </div>

        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt=""
            width={356}
            height={534}
            style={{
              width: 356,
              height: 534,
              objectFit: "cover",
              border: "3px solid #000",
              borderRadius: 8,
            }}
          />
        ) : (
          <div
            style={{
              width: 356,
              height: 534,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid #000",
              borderRadius: 8,
              fontSize: 96,
              fontWeight: 700,
            }}
          >
            NFC
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
