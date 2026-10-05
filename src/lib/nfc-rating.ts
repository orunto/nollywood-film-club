export const MIN_NFC_RATINGS = 25;

/** Arithmetic mean of eligible integer ratings, including historical zeroes. */
export function calculateNfcRating(
  ratings: ReadonlyArray<{ rating: number | null; restricted?: boolean; userId?: string }>,
): number | null {
  let total = 0;
  let count = 0;
  for (const { rating, restricted, userId } of ratings) {
    if (rating === null || (restricted && !userId?.startsWith("legacy-poll:"))) continue;
    if (Number.isInteger(rating) && rating >= 0 && rating <= 10) {
      total += rating;
      count += 1;
    }
  }
  return count === 0 ? null : total / count;
}
