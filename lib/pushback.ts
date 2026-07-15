// Shared between the pushback API and the UI that posts to it.

// How deep a thread may nest. Past this, replies are refused rather than
// silently flattened, so the tree in the database always matches what renders.
export const MAX_PUSHBACK_DEPTH = 5;

// Pushback is a reply, not an essay — the review is where the long take goes.
export const MAX_PUSHBACK_LENGTH = 1000;

// Past this depth the UI stops indenting and renders replies flush, the way X
// does. The thread keeps nesting in the data; it just stops marching off the
// right edge of a phone.
export const MAX_PUSHBACK_INDENT = 3;

export const REPORT_REASONS = [
  { value: "spoiler", label: "Spoilers, unmarked" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam or self-promo" },
  { value: "off_topic", label: "Nothing to do with the film" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportTarget = "review" | "pushback";
