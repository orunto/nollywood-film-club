import type { MetaDescriptor } from "react-router";

export const SITE_URL = "https://nollywoodfilm.club";
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";
export const SITE_TITLE = "Nollywood Film Club | Movie Reviews, Ratings & Discussions";
export const SITE_DESCRIPTION =
  "Discover Nollywood films and TV series through member reviews, NFC ratings, streaming links and weekly film discussions. Find your next watch and join the club.";

export function metaDescription(text: string, maxLength = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const candidate = normalized.slice(0, maxLength - 1);
  const boundary = candidate.lastIndexOf(" ");
  return `${boundary > maxLength / 2 ? candidate.slice(0, boundary) : candidate}…`;
}

export function routeLoaderData<T>(
  matches: readonly ({ id: string; loaderData?: unknown } | undefined)[],
  routeId: string,
): T | undefined {
  return matches.find((match) => match?.id === routeId)?.loaderData as T | undefined;
}

// Shared meta builder so every route emits the same tag set crawlers expect
// (canonical, Open Graph, Twitter). Leaf route meta replaces the root's, so
// pages with their own meta must go through this to keep OG tags.
export function pageMeta({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE_PATH,
  type = "website",
}: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  type?: "website" | "video.movie" | "video.tv_show";
}): MetaDescriptor[] {
  const url = new URL(path, SITE_URL).href;
  const imageUrl = new URL(image, SITE_URL).href;
  return [
    { title },
    ...(description ? [{ name: "description", content: description }] : []),
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    ...(description ? [{ property: "og:description", content: description }] : []),
    { property: "og:type", content: type },
    { property: "og:image", content: imageUrl },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    ...(description ? [{ name: "twitter:description", content: description }] : []),
    { name: "twitter:image", content: imageUrl },
  ];
}
