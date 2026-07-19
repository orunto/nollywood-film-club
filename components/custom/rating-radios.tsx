"use client";
import { ThumbsUpIcon, ThumbsDownIcon, MinusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

// The three-way rating shared by the film rating sheet and the dashboard editor.
// 0 is a real value ("didn't like it"); null means nothing chosen yet.
export const RATING_OPTIONS = [
  { value: 10, label: "I liked it", Icon: ThumbsUpIcon },
  { value: 5, label: "It was okay", Icon: MinusIcon },
  { value: 0, label: "I didn't like it", Icon: ThumbsDownIcon },
] as const;

interface RatingRadiosProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function RatingRadios({ value, onChange, disabled, className }: RatingRadiosProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Your rating"
      className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3", className)}
    >
      {RATING_OPTIONS.map(({ value: optionValue, label, Icon }) => {
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-sm border px-3 py-3 text-sm transition-colors disabled:opacity-50",
              selected
                ? "border-black bg-black text-white"
                : "border-black/10 hover:bg-black/5",
            )}
          >
            <Icon className="h-4 w-4" weight={selected ? "fill" : "regular"} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
