import type {
  Content,
  CriticReview,
  Discussion,
  PublicReadRepository,
  UserRating,
} from "../repositories/public-read";
import { contentTypeLabel } from "../lib/utils";
import { mergeDiscussions } from "./homepage";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const contentBasePaths = {
  movie: "/movie",
  tv_show: "/tv",
  short_film: "/short",
} as const;

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function contentSlug(
  title: string,
  releaseDate?: Date | string | null,
): string {
  const slug = slugifyTitle(title);
  if (!releaseDate) return slug;
  const date =
    typeof releaseDate === "string" ? new Date(releaseDate) : releaseDate;
  return Number.isNaN(date.getTime())
    ? slug
    : `${slug}-${date.getUTCFullYear()}`;
}

export function contentPath(item: Content): string {
  return `${contentBasePaths[item.contentType]}/${contentSlug(item.title, item.releaseDate)}`;
}

export function getRelatedContent(
  item: Content,
  catalog: Content[],
  limit = 4,
): Content[] {
  const genres = new Set((item.genre ?? []).map((genre) => genre.toLowerCase()));

  return catalog
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => ({
      candidate,
      sharedGenres: (candidate.genre ?? []).filter((genre) =>
        genres.has(genre.toLowerCase()),
      ).length,
    }))
    .filter(
      ({ candidate, sharedGenres }) =>
        sharedGenres > 0 || candidate.contentType === item.contentType,
    )
    .sort((left, right) => right.sharedGenres - left.sharedGenres)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export async function resolveContent(
  repository: PublicReadRepository,
  rawParam: string,
): Promise<Content | null> {
  const param = decodeURIComponent(rawParam);
  if (UUID_PATTERN.test(param)) {
    return repository.getContentById(param);
  }

  const index = await repository.getContentSlugIndex();
  const match = index.find(
    (entry) => contentSlug(entry.title, entry.releaseDate) === param,
  );
  return match ? repository.getContentById(match.id) : null;
}

async function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export interface ContentDetailData {
  item: Content;
  canonicalPath: string;
  userRatings: UserRating[];
  episodes: Discussion[];
  criticReviews: CriticReview[];
  related: Content[];
  discussion: ReturnType<typeof mergeDiscussions>;
}

// A UUID, slug, or legacy UUID used as the raw path param for a content route.
// True when the resolved item's canonical path matches the path it was opened
// under; used to permanent-redirect stale/wrong-type URLs (see content-route).
export function isCanonicalFor(
  data: ContentDetailData,
  rawParam: string,
  basePath: "/movie" | "/tv" | "/short",
): boolean {
  return data.canonicalPath === `${basePath}/${decodeURIComponent(rawParam)}`;
}

export function contentMetadata(item: Content | null): {
  title: string;
  description: string;
  canonical: string | null;
} {
  if (!item) {
    return { title: "Not Found — Nollywood Film Club", description: "", canonical: null };
  }

  const year = item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;
  const title = `${item.title}${year ? ` (${year})` : ""} — Nollywood Film Club`;
  const description =
    item.synopsis ??
    `${item.title} — ${contentTypeLabel(item.contentType)} on Nollywood Film Club.`;

  return { title, description, canonical: contentPath(item) };
}

export async function getContentDetailData(
  repository: PublicReadRepository,
  rawParam: string,
): Promise<ContentDetailData | null> {
  const item = await withFallback(resolveContent(repository, rawParam), null);
  if (!item) return null;

  const [userRatings, episodes, criticReviews, catalog] = await Promise.all([
    withFallback(repository.getUserRatingsForContent(item.id), []),
    withFallback(repository.getDiscussionsForContent(item.id), []),
    withFallback(repository.getCriticReviewsForContent(item.id), []),
    withFallback(repository.getAllContent(), []),
  ]);

  return {
    item,
    canonicalPath: contentPath(item),
    userRatings,
    episodes,
    criticReviews,
    related: getRelatedContent(item, catalog),
    discussion: mergeDiscussions(episodes),
  };
}
