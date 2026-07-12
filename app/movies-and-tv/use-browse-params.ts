"use client";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterState, SortValue, SORT_OPTIONS } from "@/lib/browse";

const CONTENT_TYPES = ["movie", "tv_show", "short_film"];
const FILTER_KEYS = ["year", "platform", "genre", "score"] as const;

export interface BrowseParams {
  filters: FilterState;
  sort: SortValue;
  page: number; // parsed, >= 1; clamp against totalPages at render time
}

const splitParam = (value: string | null): string[] =>
  value ? value.split(",").filter(Boolean) : [];

export function useBrowseParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const state: BrowseParams = useMemo(() => {
    const type = searchParams.get("type");
    const sort = searchParams.get("sort");
    const page = parseInt(searchParams.get("page") ?? "", 10);

    return {
      filters: {
        type: type && CONTENT_TYPES.includes(type) ? type : null,
        years: splitParam(searchParams.get("year")),
        platforms: splitParam(searchParams.get("platform")),
        genres: splitParam(searchParams.get("genre")),
        scores: splitParam(searchParams.get("score")),
      },
      sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortValue) : "newest",
      page: Number.isNaN(page) ? 1 : Math.max(page, 1),
    };
  }, [searchParams]);

  // Applies a patch of raw param values (null/""/default removes the param) and
  // navigates. Any change other than `page` itself resets pagination.
  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || (key === "sort" && value === "newest")) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      if (!("page" in patch)) params.delete("page");
      if (params.get("page") === "1") params.delete("page");

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  // Toggles one value inside a comma-joined multi-select param
  const toggleFilter = useCallback(
    (key: (typeof FILTER_KEYS)[number], value: string) => {
      const current = splitParam(searchParams.get(key));
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setParam({ [key]: next.join(",") || null });
    },
    [searchParams, setParam],
  );

  // Clears filters but keeps tab and sort — tab is navigation, not a filter
  const resetFilters = useCallback(() => {
    setParam(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
  }, [setParam]);

  // Shareable href for a pagination link (SSR-safe — no window access)
  const pageHref = useCallback(
    (target: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (target <= 1) params.delete("page");
      else params.set("page", String(target));
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [searchParams, pathname],
  );

  return { state, setParam, toggleFilter, resetFilters, pageHref };
}
