"use client";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FilterOption } from "@/lib/browse";

interface FilterGroupProps {
    label: string;
    options: FilterOption[];
    selected: string[];
    onToggle: (value: string) => void;
    collapsibleAfter?: number;
}

export default function FilterGroup({
    label,
    options,
    selected,
    onToggle,
    collapsibleAfter = 6,
}: FilterGroupProps) {
    const [expanded, setExpanded] = useState(false);

    if (options.length === 0) return null;

    const visible = expanded ? options : options.slice(0, collapsibleAfter);
    const hiddenCount = options.length - collapsibleAfter;

    return (
        <div className="flex flex-col gap-3 border-t border-black/20 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest">{label}</h3>
            <div className="flex flex-col gap-2">
                {visible.map((option) => {
                    const id = `filter-${label}-${option.value}`.replace(/\s+/g, "-").toLowerCase();
                    return (
                        <div key={option.value} className="flex items-center gap-2">
                            <Checkbox
                                id={id}
                                checked={selected.includes(option.value)}
                                onCheckedChange={() => onToggle(option.value)}
                                className="rounded-[2px] border-black/40 data-[state=checked]:bg-black data-[state=checked]:border-black"
                            />
                            <Label htmlFor={id} className="text-sm font-light cursor-pointer">
                                {option.label}
                            </Label>
                        </div>
                    );
                })}
            </div>
            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs underline text-black/60 hover:text-black w-fit cursor-pointer"
                >
                    {expanded ? "Show less" : `Show more (${hiddenCount})`}
                </button>
            )}
        </div>
    );
}
