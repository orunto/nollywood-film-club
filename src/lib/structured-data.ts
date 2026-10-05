import type { Content, FeedReview } from "../repositories/public-read";
import { SITE_URL } from "./meta";
import { posterUrl } from "./media";
import { contentPath, markdownToPlainText, nfcPercent } from "./utils";

type SchemaNode = Record<string, unknown>;

// Prevent user-written text from closing the script element in server-rendered HTML.
export function serializeStructuredData(data: SchemaNode): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function graph(nodes: SchemaNode[]): SchemaNode {
  return { "@context": "https://schema.org", "@graph": nodes };
}

function isoDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function breadcrumbs(items: { name: string; path: string }[]): SchemaNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, path }, index) => ({
      "@type": "ListItem", position: index + 1, name, item: new URL(path, SITE_URL).href,
    })),
  };
}

export function organizationStructuredData(): SchemaNode {
  return graph([
    {
      "@type": "Organization", "@id": `${SITE_URL}/#organization`,
      name: "Nollywood Film Club", url: SITE_URL,
      logo: `${SITE_URL}/assets/svg/logo.svg`,
      description: "Discover, watch, rate, and discuss Nollywood films.",
    },
    {
      "@type": "WebSite", "@id": `${SITE_URL}/#website`,
      name: "Nollywood Film Club", url: SITE_URL, inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ]);
}

export function contentStructuredData(item: Content): SchemaNode {
  const url = new URL(contentPath(item), SITE_URL).href;
  const score = nfcPercent(item.userRating);
  const people = (role: "actor" | "director") => item.castMembers
    ?.filter((member) => member.role === role && member.name.trim())
    .map((member) => ({ "@type": "Person", name: member.name }));
  return graph([
    {
      "@type": item.contentType === "tv_show" ? "TVSeries" : "Movie",
      "@id": `${url}#title`, url, name: item.title,
      description: item.synopsis || undefined,
      image: item.posterImage ? new URL(posterUrl(item.posterImage, { version: item.posterVersion }), SITE_URL).href : undefined,
      datePublished: isoDate(item.releaseDate),
      genre: item.genre?.length ? item.genre : undefined,
      contentRating: item.rating || undefined,
      duration: item.contentType !== "tv_show" && item.runtime && item.runtime > 0 ? `PT${item.runtime}M` : undefined,
      actor: people("actor"), director: people("director"),
      aggregateRating: score !== null && score >= 0 && score <= 100 && item.ratingsCount > 0 ? {
        "@type": "AggregateRating", ratingValue: score, ratingCount: item.ratingsCount,
        bestRating: 100, worstRating: 0,
      } : undefined,
    },
    breadcrumbs([
      { name: "Home", path: "/" }, { name: "Movies & TV", path: "/movies-and-tv" },
      { name: item.title, path: contentPath(item) },
    ]),
  ]);
}

export function reviewStructuredData(review: FeedReview): SchemaNode | null {
  const body = review.review ? markdownToPlainText(review.review).trim() : "";
  if (!review.film || !body || !review.username || review.restricted) return null;
  const filmUrl = new URL(contentPath(review.film), SITE_URL).href;
  const path = `/reviews/${encodeURIComponent(review.id)}`;
  const url = new URL(path, SITE_URL).href;
  return graph([
    {
      "@type": "Review", "@id": `${url}#review`, url,
      name: `${review.username} on ${review.film.title}`,
      reviewBody: body,
      datePublished: isoDate(review.createdAt), dateModified: isoDate(review.updatedAt),
      author: {
        "@type": "Person", name: review.username,
        url: review.profileUsername ? `${SITE_URL}/members/${encodeURIComponent(review.profileUsername)}` : undefined,
      },
      itemReviewed: {
        "@type": review.film.contentType === "tv_show" ? "TVSeries" : "Movie",
        "@id": `${filmUrl}#title`, url: filmUrl, name: review.film.title,
      },
      // Individual ratings are displayed as verdict faces, not numeric scores.
    },
    breadcrumbs([
      { name: "Home", path: "/" }, { name: "Reviews", path: "/reviews" },
      { name: `${review.username} on ${review.film.title}`, path },
    ]),
  ]);
}
