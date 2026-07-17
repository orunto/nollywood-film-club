import { Content } from "@/lib/server-queries";
import { VIEWING_CATEGORIES } from "@/lib/utils";

// Pure helpers for the /movies-and-tv browse page. No React — keep these
// unit-testable and shared between the client components.

export const PAGE_SIZE = 12;

export const PLATFORM_LABELS: Record<string, string> = {
  netflix: "Netflix",
  prime_video: "Prime Video",
  youtube: "YouTube",
  disney_plus: "Disney+",
  hulu: "Hulu",
  hbo_max: "HBO Max",
  apple_tv: "Apple TV+",
  paramount_plus: "Paramount+",
  peacock: "Peacock",
  other: "Other",
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest Releases" },
  { value: "oldest", label: "Oldest Releases" },
  { value: "score", label: "Highest NFC Score" },
  { value: "added", label: "Recently Added" },
  { value: "title", label: "Title A–Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const SCORE_BANDS = [
  { value: "high", label: "Above 7" },
  { value: "mid", label: "4 – 7" },
  { value: "low", label: "4 & below" },
  { value: "unrated", label: "Unrated" },
] as const;

export type ScoreBand = (typeof SCORE_BANDS)[number]["value"];

export interface FilterState {
  type: string | null; // contentType tab; null = all
  years: string[];
  platforms: string[];
  genres: string[]; // lowercase keys
  scores: string[]; // ScoreBand values
  viewingCategories: string[]; // ViewingCategory values
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface DerivedOptions {
  years: FilterOption[];
  platforms: FilterOption[];
  genres: FilterOption[];
  viewingCategories: FilterOption[];
}

// Band boundaries mirror scoreBadgeClass (lib/utils.ts): exactly 7 renders the
// amber badge so it belongs to "mid"; exactly 4 renders red so it's "low".
export function scoreBand(userRating: number | null): ScoreBand {
  if (userRating === null) return "unrated";
  if (userRating > 7) return "high";
  if (userRating > 4) return "mid";
  return "low";
}

export function deriveFilterOptions(items: Content[]): DerivedOptions {
  const years = new Set<number>();
  // lowercase key -> first-seen casing, since genre is freeform admin input
  const genres = new Map<string, string>();
  const platforms = new Set<string>();
  const viewingCategories = new Set<string>();

  for (const item of items) {
    if (item.releaseDate) years.add(new Date(item.releaseDate).getFullYear());
    for (const raw of item.genre ?? []) {
      const label = raw.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!genres.has(key)) genres.set(key, label);
    }
    if (item.streamingPlatform) platforms.add(item.streamingPlatform);
    if (item.viewingCategory) viewingCategories.add(item.viewingCategory);
  }

  return {
    years: [...years]
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: String(y) })),
    genres: [...genres.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ value: key, label })),
    platforms: Object.keys(PLATFORM_LABELS)
      .filter((p) => platforms.has(p))
      .map((p) => ({ value: p, label: PLATFORM_LABELS[p] })),
    viewingCategories: VIEWING_CATEGORIES.filter((c) => viewingCategories.has(c.value)).map(
      (c) => ({ value: c.value, label: c.label }),
    ),
  };
}

// Case-insensitive title match against the free-text search box
export function searchContent(items: Content[], query: string): Content[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.title.toLowerCase().includes(q));
}

// OR within a dimension, AND across dimensions. Items missing a dimension's
// value are excluded whenever that dimension has an active filter.
export function applyFilters(items: Content[], state: FilterState): Content[] {
  return items.filter((item) => {
    if (state.type && item.contentType !== state.type) return false;

    if (state.years.length > 0) {
      if (!item.releaseDate) return false;
      const year = String(new Date(item.releaseDate).getFullYear());
      if (!state.years.includes(year)) return false;
    }

    if (state.platforms.length > 0) {
      if (!item.streamingPlatform) return false;
      if (!state.platforms.includes(item.streamingPlatform)) return false;
    }

    if (state.viewingCategories.length > 0) {
      if (!item.viewingCategory) return false;
      if (!state.viewingCategories.includes(item.viewingCategory)) return false;
    }

    if (state.genres.length > 0) {
      const itemGenres = (item.genre ?? []).map((g) => g.trim().toLowerCase());
      if (!itemGenres.some((g) => state.genres.includes(g))) return false;
    }

    if (state.scores.length > 0 && !state.scores.includes(scoreBand(item.userRating))) {
      return false;
    }

    return true;
  });
}

export function sortContent(items: Content[], sort: SortValue): Content[] {
  const byReleaseDate = (item: Content) =>
    item.releaseDate ? new Date(item.releaseDate).getTime() : null;
  const byCreatedAt = (item: Content) =>
    item.createdAt ? new Date(item.createdAt).getTime() : 0;

  // Comparator wrapper that always sends null keys to the end
  const nullsLast =
    <T,>(key: (item: Content) => T | null, compare: (a: T, b: T) => number) =>
    (a: Content, b: Content) => {
      const ka = key(a);
      const kb = key(b);
      if (ka === null && kb === null) return 0;
      if (ka === null) return 1;
      if (kb === null) return -1;
      return compare(ka, kb);
    };

  const sorted = [...items];
  switch (sort) {
    case "newest":
      sorted.sort(
        nullsLast(byReleaseDate, (a, b) => b - a),
      );
      break;
    case "oldest":
      sorted.sort(nullsLast(byReleaseDate, (a, b) => a - b));
      break;
    case "score":
      sorted.sort(
        nullsLast(
          (item) => item.userRating,
          (a, b) => b - a,
        ),
      );
      break;
    case "added":
      // Mirrors the homepage ordering: catalogNumber desc nulls last, then createdAt desc
      sorted.sort((a, b) => {
        if (a.catalogNumber !== null && b.catalogNumber !== null) {
          if (b.catalogNumber !== a.catalogNumber) return b.catalogNumber - a.catalogNumber;
        } else if (a.catalogNumber !== null) return -1;
        else if (b.catalogNumber !== null) return 1;
        return byCreatedAt(b) - byCreatedAt(a);
      });
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  return sorted;
}
