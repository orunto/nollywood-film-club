'use client';
import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
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
  const [rating, setRating] = useState(0);
  // const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");

  const handleRatingSubmit = async () => {
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
        // Reset form
        setRating(0);
        setReview("");
        if (onRatingSubmit) {
          onRatingSubmit();
        }
      } else {
        toast.error(result.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div title={isRatingEnabled ? "Rate this movie" : "Come back after our space 😉"} className="w-full">
          <Button 
            disabled={!isRatingEnabled} 
            variant={'outline'} 
            className="w-full py-4 border-primary text-primary"
          >
            Rate this Movie <Star />
          </Button>
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[500px] flex flex-col lg:px-40 gap-0">
        <SheetHeader>
          <SheetTitle className="lg:text-xl text-lg">Rate {movieTitle}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 p-4">
          <div className="space-y-6">
            <Select
              onValueChange={(value) =>
                setRating(Number(value))
              }
            >
              <SelectTrigger id="edit-rating" className="w-full">
                <SelectValue placeholder="Select a rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    I liked it 
                    {/*(10 points)*/}
                  </div>
                </SelectItem>
                <SelectItem value="5">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4" />
                    It was okay 
                    {/*(5 points)*/}
                  </div>
                </SelectItem>
                <SelectItem value="0">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4" />
                    I didn&apos;t like it 
                    {/*(0 points)*/}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {/*<div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 cursor-pointer ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  />
                ))}
              </div>
            </div>*/}
            <div>
              <h3 className="lg:text-base text-sm font-medium mb-2">Your Review (Optional)</h3>
              <Textarea
              className="h-50 lg:text-base text-sm focus-visible:ring-0 focus-visible:border-primary/50"
                placeholder="Share your thoughts about this movie..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
              />
            </div>
          </div>
        </div>
        
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button 
              onClick={handleRatingSubmit}
            >
              Submit Rating
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}