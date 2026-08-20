"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
} from "@phosphor-icons/react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { contentPath } from "../../lib/utils";

const VIEWPORTS = [
  { value: "desktop", label: "Desktop", width: 1440, height: 900, icon: DesktopIcon },
  { value: "tablet", label: "Tablet", width: 820, height: 1180, icon: DeviceTabletIcon },
  { value: "mobile", label: "Mobile", width: 390, height: 844, icon: DeviceMobileIcon },
] as const;

type ViewportValue = (typeof VIEWPORTS)[number]["value"];

export interface PreviewItem {
  id: string;
  title: string;
  contentType: "movie" | "tv_show" | "short_film";
  releaseDate: string | null;
}

// Remounts with the chosen viewport whenever a new film is previewed, so the
// frame starts on desktop rather than inheriting the last row's choice.
export function ContentPreview({
  movie,
  onOpenChange,
}: {
  movie: PreviewItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [viewport, setViewport] = useState<ViewportValue>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  const frame = VIEWPORTS.find((v) => v.value === viewport)!;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const fit = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      setScale(Math.min(1, width / frame.width, height / frame.height));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [frame.width, frame.height, movie]);

  const href = movie ? contentPath(movie) : "";

  return (
    <Dialog open={Boolean(movie)} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[92vh] w-[95vw] flex-col gap-0 rounded-sm p-0 sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-black/10 p-4">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base">{movie?.title ?? "Preview"}</DialogTitle>
            <DialogDescription className="truncate text-xs">
              {href} · {frame.width} × {frame.height}
              {scale < 1 && ` · ${Math.round(scale * 100)}%`}
            </DialogDescription>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center rounded-sm border border-black/20 p-0.5">
              {VIEWPORTS.map((option) => {
                const Icon = option.icon;
                const active = option.value === viewport;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setViewport(option.value)}
                    aria-pressed={active}
                    title={`${option.label} — ${option.width}×${option.height}`}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs transition-colors ${
                      active ? "bg-black text-white" : "text-black/60 hover:bg-black/5"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-black/60 hover:bg-black/10 hover:text-black"
              onClick={() => setReloadKey((key) => key + 1)}
              title="Reload preview"
            >
              <ArrowClockwiseIcon className="h-4 w-4" />
            </Button>

            {movie && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-sm border-black/20 font-normal shadow-none"
              >
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOutIcon className="h-4 w-4" />
                  Open
                </a>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              className="rounded-sm bg-black text-white shadow-none hover:bg-black/80"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogHeader>

        <div ref={stageRef} className="min-h-0 flex-1 overflow-hidden bg-black/5 p-4">
          {movie && (
            <div
              className="mx-auto overflow-hidden border border-black/20 bg-white shadow-sm"
              style={{ width: frame.width * scale, height: frame.height * scale }}
            >
              <iframe
                key={`${movie.id}-${reloadKey}`}
                src={href}
                title={`${movie.title} preview`}
                className="origin-top-left border-0"
                style={{
                  width: frame.width,
                  height: frame.height,
                  transform: `scale(${scale})`,
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}