"use client";
import FilterGroup from "./filter-group";
import { DerivedOptions, FilterState, SCORE_BANDS } from "@/lib/browse";

interface FilterSidebarProps {
    options: DerivedOptions;
    filters: FilterState;
    onToggle: (key: "year" | "platform" | "genre" | "score", value: string) => void;
    onReset: () => void;
}

export default function FilterSidebar({ options, filters, onToggle, onReset }: FilterSidebarProps) {
    const hasActiveFilters =
        filters.years.length > 0 ||
        filters.platforms.length > 0 ||
        filters.genres.length > 0 ||
        filters.scores.length > 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest">Filters</h2>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="text-xs underline text-black/60 hover:text-black cursor-pointer"
                    >
                        Reset
                    </button>
                )}
            </div>

            <FilterGroup
                label="Release Year"
                options={options.years}
                selected={filters.years}
                onToggle={(value) => onToggle("year", value)}
            />
            <FilterGroup
                label="Streaming Service"
                options={options.platforms}
                selected={filters.platforms}
                onToggle={(value) => onToggle("platform", value)}
            />
            <FilterGroup
                label="Genre"
                options={options.genres}
                selected={filters.genres}
                onToggle={(value) => onToggle("genre", value)}
            />
            <FilterGroup
                label="NFC Score"
                options={[...SCORE_BANDS]}
                selected={filters.scores}
                onToggle={(value) => onToggle("score", value)}
            />
        </div>
    );
}
