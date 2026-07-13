"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import ContentCard from "@/components/custom/content-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Content } from "@/lib/server-queries";
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  applyFilters,
  deriveFilterOptions,
  sortContent,
} from "@/lib/browse";
import FilterSidebar from "./filter-sidebar";
import { useBrowseParams } from "./use-browse-params";
import { useDebounce } from "@/hooks/use-debounce";


const TABS = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv_show", label: "TV Shows" },
  { value: "short_film", label: "Short Films" },
];

// Page numbers to render: first, last, current ±1, with nulls marking ellipsis gaps
function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null);
    result.push(sorted[i]);
  }
  return result;
}

export default function BrowseContent({
  allContent,
}: {
  allContent: Content[];
}) {
  const { state, setParam, toggleFilter, resetFilters, pageHref } =
    useBrowseParams();
  const gridRef = useRef<HTMLElement>(null);

  const [searchInput, setSearchInput] = useState(state.query);
  const debouncedSearch = useDebounce(searchInput, 300);
  const options = useMemo(() => deriveFilterOptions(allContent), [allContent]);

  const filtered = useMemo(
    () => sortContent(applyFilters(allContent, state.filters), state.sort),
    [allContent, state.filters, state.sort, debouncedSearch],
  );

  const filteredBySearch = useMemo(
    () => filtered.filter((item) => item.title.toLowerCase().includes(debouncedSearch.toLowerCase())),
    [filtered, debouncedSearch],
  );

  const totalPages = Math.max(Math.ceil(filteredBySearch.length / PAGE_SIZE), 1);
  const page = Math.min(state.page, totalPages);
  const pageItems = filteredBySearch.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFilterCount =
    state.filters.years.length +
    state.filters.platforms.length +
    state.filters.genres.length +
    state.filters.scores.length;

  const goToPage = (target: number) => {
    setParam({ page: String(target) });
    gridRef.current?.scrollIntoView({ block: "start" });
  };

  const sidebar = (
    <FilterSidebar
      options={options}
      filters={state.filters}
      onToggle={toggleFilter}
      onReset={resetFilters}
    />
  );

  return (
    <div className="w-full">
      <div className=" flex border-b border-black gap-4 justify-between w-full">
        <h1 className="pb-3 text-2xl font-semibold">Movies &amp; TV</h1>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search titles…"
            aria-label="Search titles"
            className="rounded-sm border-black/40 pl-9 pr-9 shadow-none focus-visible:border-black focus-visible:ring-black/20"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 py-6">
        <Tabs
          value={state.filters.type ?? "all"}
          onValueChange={(value) =>
            setParam({ type: value === "all" ? null : value })
          }
        >
          <TabsList className="bg-transparent p-0 h-auto gap-6 border-b border-black/20 w-full justify-start rounded-none">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none shadow-none data-[state=active]:shadow-none bg-transparent px-0 pb-2 border-0 border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:font-semibold text-black/60 data-[state=active]:text-black cursor-pointer"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-black/60">
            {filtered.length} {filtered.length === 1 ? "title" : "titles"}
          </span>

          <div className="flex items-center gap-3">
            <Select
              value={state.sort}
              onValueChange={(value) => setParam({ sort: value })}
            >
              <SelectTrigger className="w-fit gap-2 rounded-sm border-black/40 text-sm cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mobile filters trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden rounded-sm border-black/40 gap-2"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && ` (${activeFilterCount})`}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="max-h-[85vh] overflow-y-auto px-6 pb-6"
              >
                <SheetHeader className="px-0">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                {sidebar}
                <SheetFooter className="px-0 pt-4">
                  <SheetClose asChild>
                    <Button className="w-full bg-black text-white hover:bg-black/80 hover:text-white">
                      Show {filtered.length}{" "}
                      {filtered.length === 1 ? "result" : "results"}
                    </Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] lg:gap-10">
          <aside className="hidden lg:block">{sidebar}</aside>

          <section ref={gridRef} className="flex flex-col gap-8 scroll-mt-4">
            {pageItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {pageItems.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <p className="text-black/60">
                  {allContent.length === 0
                    ? "No titles yet — check back soon."
                    : "No titles match your filters."}
                </p>
                {allContent.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="rounded-sm border-black"
                  >
                    Reset filters
                  </Button>
                )}
              </div>
            )}

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={pageHref(page - 1)}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) goToPage(page - 1);
                      }}
                      aria-disabled={page === 1}
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                  {pageWindow(page, totalPages).map((p, i) => (
                    <PaginationItem key={p === null ? `gap-${i}` : p}>
                      {p === null ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href={pageHref(p)}
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            goToPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href={pageHref(page + 1)}
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) goToPage(page + 1);
                      }}
                      aria-disabled={page === totalPages}
                      className={
                        page === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
