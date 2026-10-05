"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn, getRatingLabel } from "../../lib/utils";
import RatingFace from "./rating-face";

export default function RatingSlider({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const label = getRatingLabel(value);
  // A legacy zero remains unchanged until the member intentionally moves the slider.
  const [position, setPosition] = useState(value === null ? 5 : Math.max(1, value));
  const emittedValue = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    // Keep the continuous thumb position when the parent accepts a rounded score.
    // Only a separately loaded/reset rating should reposition the control.
    if (value !== emittedValue.current) setPosition(value === null ? 5 : Math.max(1, value));
  }, [value]);

  const selectPosition = (nextPosition: number) => {
    setPosition(nextPosition);
    const score = Math.round(nextPosition);
    emittedValue.current = score;
    onChange(score);
  };
  const fraction = (position - 1) / 9;

  return (
    <div className={cn("flex items-center gap-4", disabled && "opacity-50", className)}>
      <div className="flex w-24 shrink-0 flex-col items-center gap-2 text-center" aria-live="polite" aria-atomic="true">
        <RatingFace rating={value} className="h-12 w-12" />
        <p id={`${id}-meaning`} className="text-sm font-medium">{label}</p>
      </div>
      <div className="relative min-w-0 flex-1 pt-6">
        {value !== null && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-sm bg-black px-2 py-0.5 text-xs font-semibold tabular-nums text-white"
            style={{ left: `calc(${fraction * 100}% + ${12 - fraction * 24}px)` }}
          >
            {value}
          </span>
        )}
        <label htmlFor={id} className="sr-only">Your rating out of 10</label>
        <input
          id={id}
          type="range"
          min={1}
          max={10}
          step={0.01}
          value={position}
          disabled={disabled}
          aria-describedby={`${id}-meaning`}
          aria-valuetext={value === null ? "I don't know; no rating selected" : `${value} out of 10: ${label}`}
          onChange={(event) => selectPosition(Number(event.currentTarget.value))}
          onPointerUp={(event) => {
            if (value === null && !disabled) selectPosition(Number(event.currentTarget.value));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              const direction = event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 1;
              selectPosition(Math.min(10, Math.max(1, Math.round(position) + direction)));
            } else if (value === null && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              selectPosition(position);
            }
          }}
          className="h-11 w-full cursor-pointer appearance-none rounded-sm bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black disabled:cursor-not-allowed [&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#b91c1c_0%,#facc15_50%,#15803d_100%)] [&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[linear-gradient(to_right,#b91c1c_0%,#facc15_50%,#15803d_100%)] [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:bg-white"
        />
      </div>
    </div>
  );
}
