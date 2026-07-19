'use client';
import { useState } from "react";
import { StarIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { REVIEW_MAX } from "@/lib/reviews";
import { useIsDesktop } from "@/hooks/use-media-query";
import MarkdownEditor from "./markdown-editor";
import RatingRadios from "./rating-radios";

interface MovieRatingSheetProps {
  movieId: string;
  movieTitle: string;
  isRatingEnabled: boolean;
  onRatingSubmit?: () => void;
}

export default function MovieRatingSheet({
  movieId,
  movieTitle,
  isRatingEnabled,
  onRatingSubmit
}: MovieRatingSheetProps) {
  const [open, setOpen] = useState(false);
  // null = no selection yet; 0 is a valid rating ("didn't like it")
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  // Submitting before the existing rating has loaded could silently wipe a
  // review, so the form stays disabled until the preload settles.
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const loadExistingRating = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await fetch(`/api/user/ratings?contentId=${movieId}`);
      if (response.status === 401) {
        // Not signed in — nothing to preload; POST will handle the redirect
        setIsEditing(false);
        return;
      }
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      if (result.data) {
        setIsEditing(true);
        setRating(result.data.rating ?? null);
        setReview(result.data.review ?? "");
      } else {
        setIsEditing(false);
        setRating(null);
        setReview("");
      }
    } catch (error) {
      console.error('Error loading existing rating:', error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      loadExistingRating();
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === null) {
      toast.error('Pick a rating first');
      return;
    }
    try {
      const response = await fetch('/api/user/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId: movieId,
          rating: rating,
          review: review,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        if (onRatingSubmit) {
          onRatingSubmit();
        }
      } else {
        if (response.status === 401) {
          toast.error('You need to be logged in to rate this movie');

          setTimeout(() => {
            router.push('/auth');
          }, 3000);
        } else {
        toast.error(result.error || 'Failed to submit rating');

        }
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    }
  };

  const canSubmit = !loading && !loadFailed && rating !== null;
  const title = isEditing ? `Update your rating of ${movieTitle}` : `Rate ${movieTitle}`;

  const trigger = (
    <div title={isRatingEnabled ? "Rate this movie" : "Come back after our space 😉"} className="w-full">
      <Button
        disabled={!isRatingEnabled}
        variant={'outline'}
        className="w-full py-4 border-primary text-primary"
      >
        Rate this Movie <StarIcon />
      </Button>
    </div>
  );

  const form = (
    <div className="space-y-6">
      <RatingRadios value={rating} onChange={setRating} disabled={loading} />

      <div>
        <h3 className="lg:text-base text-sm font-medium mb-2">Your Review (Optional)</h3>
        <MarkdownEditor
          value={review}
          onChange={setReview}
          disabled={loading}
          maxLength={REVIEW_MAX}
          placeholder="Share your thoughts about this movie..."
        />
      </div>

      {loadFailed && (
        <p className="text-sm text-destructive">
          Couldn&apos;t load your existing rating.{" "}
          <button type="button" className="underline" onClick={loadExistingRating}>
            Try again
          </button>
        </p>
      )}
    </div>
  );

  const footerButtons = (
    <>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleRatingSubmit} disabled={!canSubmit}>
        {isEditing ? 'Update Rating' : 'Submit Rating'}
      </Button>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-lg rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </DialogHeader>
          {form}
          <DialogFooter>{footerButtons}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="flex max-h-[90vh] flex-col gap-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 p-4">{form}</div>
        <SheetFooter>{footerButtons}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
