// Shared review constraints. Reviews are stored as Markdown (plain text) in
// userRatings.review.
//
// REVIEW_MAX is the visible-character limit (matches the editor's counter and
// what a reader sees). We couldn't find an official Letterboxd figure — it isn't
// published — so this mirrors IMDb's documented 10,000-character review cap.
export const REVIEW_MAX = 10000;

// The stored Markdown can be a little longer than the visible text because of
// formatting syntax (**, *, "- ", "1. "). The write routes cap the raw string
// at this larger bound so a fully-formatted, at-limit review is never rejected.
export const REVIEW_MAX_STORED = REVIEW_MAX + 2000;
