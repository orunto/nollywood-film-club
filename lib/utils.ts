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

// Image naming utilities
/**
 * Generates a public image name for Cloudinary based on movie title and release year.
 * Converts to snake_case format.
 * 
 * @param title - The movie/content title
 * @param releaseDate - The release date (Date, string, or null)
 * @returns A snake_case formatted string suitable for use as a public image name
 * 
 * @example
 * generateImagePublicName("Everybody Loves Jenifa", "2024-01-15")
 * // Returns: "everybody_loves_jenifa_2024"
 * 
 * @example
 * generateImagePublicName("The King's Man", new Date("2024-12-25"))
 * // Returns: "the_kings_man_2024"
 */
export function generateImagePublicName(title: string, releaseDate?: Date | string | null): string {
  if (!title) return "";
  
  // Extract year from releaseDate
  let year = "";
  if (releaseDate) {
    const date = typeof releaseDate === "string" ? new Date(releaseDate) : releaseDate;
    if (!isNaN(date.getTime())) {
      year = date.getFullYear().toString();
    }
  }
  
  // Convert title to snake_case
  // 1. Convert to lowercase
  // 2. Replace special characters and spaces with underscores
  // 3. Remove consecutive underscores
  // 4. Remove leading/trailing underscores
  const snakeCaseTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscores
    .replace(/_+/g, "_") // Collapse consecutive underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
  
  // Combine title and year
  return year ? `${snakeCaseTitle}_${year}` : snakeCaseTitle;
}
