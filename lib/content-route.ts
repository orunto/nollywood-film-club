import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getContentById, getContentBySlug, Content } from "@/lib/server-queries";
import { contentPath, contentTypeLabel } from "@/lib/utils";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Accepts both SEO slugs ("everybody-loves-jenifa-2024") and legacy UUID ids
// (pre-redesign URLs that may still be bookmarked or indexed). Cached so the
// page and generateMetadata share one lookup per request.
export const resolveContent = cache(
  async (rawParam: string): Promise<Content | null> => {
    const param = decodeURIComponent(rawParam);
    return UUID_RE.test(param)
      ? getContentById(param)
      : getContentBySlug(param);
  },
);

// Shared by /movie/[slug], /tv/[slug] and /short/[slug]. 404s unknown
// params; permanently redirects legacy UUID URLs, wrong-type paths (a TV
// series opened under /movie) and stale slugs to the canonical URL.
export async function requireContentAt(
  rawParam: string,
  basePath: "/movie" | "/tv" | "/short",
): Promise<Content> {
  const item = await resolveContent(rawParam);
  if (!item) notFound();

  const canonical = contentPath(item);
  if (canonical !== `${basePath}/${decodeURIComponent(rawParam)}`) {
    permanentRedirect(canonical);
  }
  return item;
}

export function contentMetadata(item: Content | null): Metadata {
  if (!item) return { title: "Not Found — Nollywood Film Club" };

  const year = item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;
  const title = `${item.title}${year ? ` (${year})` : ""} — Nollywood Film Club`;
  const description =
    item.synopsis ??
    `${item.title} — ${contentTypeLabel(item.contentType)} on Nollywood Film Club.`;

  return {
    title,
    description,
    alternates: { canonical: contentPath(item) },
    // og:image comes from the route's opengraph-image.tsx (lib/og-image.tsx),
    // rendered dynamically with the poster in a branded card
    openGraph: {
      title,
      description,
      type: "video.movie",
    },
  };
}
