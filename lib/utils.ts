import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Rating system utilities
export const RATING_OPTIONS = {
  LIKED: { value: 10, label: "I liked it", points: 10 },
  OKAY: { value: 5, label: "It was okay", points: 5 },
  DISLIKED: { value: 0, label: "I didn't like it", points: 0 },
} as const;

export function getRatingLabel(rating: number | null): string {
  if (rating === null) return "No rating";

  switch (rating) {
    case 10:
      return RATING_OPTIONS.LIKED.label;
    case 5:
      return RATING_OPTIONS.OKAY.label;
    case 0:
      return RATING_OPTIONS.DISLIKED.label;
    default:
      return "Unknown rating";
  }
}

export function calculateAverageRating(
  ratings: Array<{ rating: number | null }>,
): number {
  const validRatings = ratings
    .filter((r) => r.rating !== null)
    .map((r) => r.rating as number);

  if (validRatings.length === 0) return 0;

  const sum = validRatings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / validRatings.length) * 10) / 10; // Round to 1 decimal place
}

export function getAverageRatingLabel(average: number): string {
  if (average === 0) return "No ratings yet";
  if (average >= 8) return "Highly liked";
  if (average >= 6) return "Generally liked";
  if (average >= 3) return "Mixed reviews";
  return "Generally disliked";
}
