'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowSquareOutIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  ArrowClockwiseIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Content } from '@/lib/server-queries';
import { contentPath } from '@/lib/utils';

// Real device-ish sizes rather than Tailwind's breakpoints: the point is to see
// the page as a visitor would, and the breakpoints are what we're checking.
const VIEWPORTS = [
  { value: 'desktop', label: 'Desktop', width: 1440, height: 900, icon: DesktopIcon },
  { value: 'tablet', label: 'Tablet', width: 820, height: 1180, icon: DeviceTabletIcon },
  { value: 'mobile', label: 'Mobile', width: 390, height: 844, icon: DeviceMobileIcon },
] as const;

type ViewportValue = (typeof VIEWPORTS)[number]['value'];

interface ContentPreviewProps {
  movie: Content | null; // the row being previewed; null closes the dialog
  onOpenChange: (open: boolean) => void;
}

export default function ContentPreview({ movie, onOpenChange }: ContentPreviewProps) {
  const [viewport, setViewport] = useState<ViewportValue>('desktop');
  // Bumped to force the iframe to remount, since we cannot reach into a
  // same-origin-but-separate document's history to reload it cleanly
  const [reloadKey, setReloadKey] = useState(0);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  const frame = VIEWPORTS.find((v) => v.value === viewport)!;

  // A 1440px-wide frame will not fit a dialog on a laptop, so scale it down to
  // whatever room the stage actually has. Never scale up: a mobile frame should
  // stay mobile-sized rather than being blown up to fill the space.
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

  // Start each film on desktop rather than inheriting the last row's choice
  useEffect(() => {
    if (movie) setViewport('desktop');
  }, [movie?.id]);

  const href = movie ? contentPath(movie) : '';

  return (
    <Dialog open={Boolean(movie)} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[95vw] w-[95vw] h-[92vh] flex flex-col gap-0 p-0 rounded-sm"
        showCloseButton={false}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-black/10 p-4">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base">
              {movie?.title ?? 'Preview'}
            </DialogTitle>
            <DialogDescription className="truncate text-xs">
              {href} · {frame.width} × {frame.height}
              {scale < 1 && ` · ${Math.round(scale * 100)}%`}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
                    className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                      active ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5'
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

        {/* Stage: measures the room available, the frame scales to fit it */}
        <div ref={stageRef} className="flex-1 min-h-0 overflow-hidden bg-black/5 p-4">
          {movie && (
            <div
              className="mx-auto overflow-hidden border border-black/20 bg-white shadow-sm"
              // The scaled frame still occupies its full unscaled box in layout,
              // so the wrapper takes the visual size to keep it centred
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
