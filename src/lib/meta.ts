import type { MetaDescriptor } from "react-router";

export const SITE_URL = "https://nollywoodfilm.club";
export const DEFAULT_OG_IMAGE_PATH = "/opengraph-image";

// Shared meta builder so every route emits the same tag set crawlers expect
// (canonical, Open Graph, Twitter). Leaf route meta replaces the root's, so
// pages with their own meta must go through this to keep OG tags.
export function pageMeta({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE_PATH,
}: {
  title: string;
  description?: string;
  path: string;
  image?: string;
}): MetaDescriptor[] {
  const url = `${SITE_URL}${path}`;
  const imageUrl = image.startsWith("https://") ? image : `${SITE_URL}${image}`;
  return [
    { title },
    ...(description ? [{ name: "description", content: description }] : []),
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    ...(description ? [{ property: "og:description", content: description }] : []),
    { property: "og:type", content: "website" },
    { property: "og:image", content: imageUrl },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    ...(description ? [{ name: "twitter:description", content: description }] : []),
    { name: "twitter:image", content: imageUrl },
  ];
}
