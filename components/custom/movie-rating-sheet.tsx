'use client';
import { useState } from "react";
import { StarIcon, ThumbsUpIcon, ThumbsDownIcon, MinusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useRouter } from "next/navigation";

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

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <div title={isRatingEnabled ? "Rate this movie" : "Come back after our space 😉"} className="w-full">
          <Button
            disabled={!isRatingEnabled}
            variant={'outline'}
            className="w-full py-4 border-primary text-primary"
          >
            Rate this Movie <StarIcon />
          </Button>
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[500px] flex flex-col lg:px-40 gap-0">
        <SheetHeader>
          <SheetTitle className="lg:text-xl text-lg">
            {isEditing ? `Update your rating of ${movieTitle}` : `Rate ${movieTitle}`}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 p-4">
          <div className="space-y-6">
            <Select
              value={rating === null ? undefined : String(rating)}
              onValueChange={(value) =>
                setRating(Number(value))
              }
              disabled={loading}
            >
              <SelectTrigger id="edit-rating" className="w-full">
                <SelectValue placeholder={loading ? "Loading..." : "Select a rating"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">
                  <div className="flex items-center gap-2">
                    <ThumbsUpIcon className="w-4 h-4" />
                    I liked it
                    {/*(10 points)*/}
                  </div>
                </SelectItem>
                <SelectItem value="5">
                  <div className="flex items-center gap-2">
                    <MinusIcon className="w-4 h-4" />
                    It was okay
                    {/*(5 points)*/}
                  </div>
                </SelectItem>
                <SelectItem value="0">
                  <div className="flex items-center gap-2">
                    <ThumbsDownIcon className="w-4 h-4" />
                    I didn&apos;t like it
                    {/*(0 points)*/}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div>
              <h3 className="lg:text-base text-sm font-medium mb-2">Your Review (Optional)</h3>
              <Textarea
              className="h-50 lg:text-base text-sm focus-visible:ring-0 focus-visible:border-primary/50"
                placeholder="Share your thoughts about this movie..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                disabled={loading}
                rows={4}
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
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button
            onClick={handleRatingSubmit}
            disabled={!canSubmit}
          >
            {isEditing ? 'Update Rating' : 'Submit Rating'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
