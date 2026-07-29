// Shared between the contact form and the API route it posts to.

export const CONTACT_CATEGORIES = [
  { value: "bug", label: "Something is broken" },
  { value: "improvement", label: "An idea to make this better" },
  { value: "other", label: "Something else entirely" },
] as const;

export type ContactCategory = (typeof CONTACT_CATEGORIES)[number]["value"];

// Long enough for a proper bug report, short enough that nobody can paste a
// novel into an unauthenticated endpoint.
export const MAX_CONTACT_LENGTH = 2000;

export const CONTACT_STATUSES = ["open", "actioned", "dismissed"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
