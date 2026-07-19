"use client";
import { useCallback, useState } from "react";
import { ChatCircleIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { useIsDesktop } from "@/hooks/use-media-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PushbackThread from "./pushback-thread";
import ScoreBox from "./score-box";
import ReviewText from "./review-text";
import type { PushbackNode } from "@/lib/server-queries";

interface PushbackSheetProps {
  reviewId: string;
  // Optional starting count for the trigger label (feed cards have it; the
  // film page does not).
  count?: number;
  // The review being pushed back on, shown atop the sheet for context.
  review?: {
    username: string;
    rating: number | null;
    body: string | null;
  };
}

// Opens a review's pushback thread in a popup (centered Dialog on desktop,
// bottom Sheet on mobile) — same responsive pattern as the rating sheet — with
// the full Markdown composer, instead of navigating to the review's page.
export default function PushbackSheet({ reviewId, count, review }: PushbackSheetProps) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<PushbackNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDesktop = useIsDesktop();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/pushbacks?reviewId=${reviewId}`);
      const data = await res.json();
      if (data.success) setThread(data.data);
    } catch (error) {
      console.error("Error loading pushback thread:", error);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [reviewId]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) refetch();
  };

  const label = count && count > 0 ? `${count} pushback${count === 1 ? "" : "s"}` : "Push back";

  const trigger = (
    <button
      type="button"
      className="flex w-fit items-center gap-1.5 text-xs text-black/50 hover:text-black cursor-pointer"
    >
      <ChatCircleIcon className="h-4 w-4" />
      {label}
    </button>
  );

  // The review being pushed back on, pinned above the thread for context.
  const reviewContext = review && (
    <div className="flex flex-col gap-2 rounded-sm border border-black/10 p-4">
      <div className="flex items-center gap-2">
        <ScoreBox score={review.rating} className="h-8 w-8 shrink-0 rounded-full text-sm" />
        <span className="text-sm font-semibold">{review.username}</span>
      </div>
      {review.body && (
        <div className="max-h-40 overflow-y-auto">
          <ReviewText source={review.body} />
        </div>
      )}
    </div>
  );

  const body = (
    <div className="flex flex-col gap-4">
      {reviewContext}
      {loading && !loaded ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-black/50">
          <CircleNotchIcon className="h-4 w-4 animate-spin" />
          Loading pushback…
        </div>
      ) : (
        <PushbackThread reviewId={reviewId} thread={thread} onPosted={refetch} showHeading={false} />
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-sm sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pushback</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Pushback</SheetTitle>
        </SheetHeader>
        <div className="p-4">{body}</div>
      </SheetContent>
    </Sheet>
  );
}
