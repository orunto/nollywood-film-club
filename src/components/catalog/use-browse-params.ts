"use client";
import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { parseBrowseParams } from "../../lib/browse";
export type { BrowseParams } from "../../lib/browse";

const FILTER_KEYS = ["year", "platform", "genre", "score", "watch"] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

const splitParam = (value: string | null): string[] =>
  value ? value.split(",").filter(Boolean) : [];

export function useBrowseParams() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = useMemo(() => parseBrowseParams(searchParams), [searchParams]);

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
      navigate(qs ? `${location.pathname}?${qs}` : location.pathname, {
        replace: true,
        preventScrollReset: true,
      });
    },
    [searchParams, location.pathname, navigate],
  );

  // Toggles one value inside a comma-joined multi-select param
  const toggleFilter = useCallback(
    (key: FilterKey, value: string) => {
      const current = splitParam(searchParams.get(key));
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setParam({ [key]: next.join(",") || null });
    },
    [searchParams, setParam],
  );

  // Clears filters and search but keeps tab and sort — tab is navigation, not a filter
  const resetFilters = useCallback(() => {
    setParam(Object.fromEntries([...FILTER_KEYS, "q"].map((k) => [k, null])));
  }, [setParam]);

  // Shareable href for a pagination link (SSR-safe — no window access)
  const pageHref = useCallback(
    (target: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (target <= 1) params.delete("page");
      else params.set("page", String(target));
      const qs = params.toString();
      return qs ? `${location.pathname}?${qs}` : location.pathname;
    },
    [searchParams, location.pathname],
  );

  return { state, setParam, toggleFilter, resetFilters, pageHref };
}
