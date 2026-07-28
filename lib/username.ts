// Shared between onboarding, the dashboard profile tab, and the two username
// API routes, so the rule can only be changed in one place.
export const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// Turn whatever we already know about someone — their OAuth display name, or
// the local part of their email — into something that passes USERNAME_RE.
// Returns "" when nothing usable survives, which the caller treats as "no
// suggestion" rather than offering a stub.
export function slugifyUsername(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents: "Àjàkájú" -> "ajakaju"
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, USERNAME_MAX);

  return slug.length >= USERNAME_MIN ? slug : "";
}

// Candidate handles to offer, best first. Availability is checked separately
// (POST /api/check-username with `usernames`), because only the server can see
// what is taken.
export function usernameSuggestions(sources: (string | null | undefined)[]): string[] {
  const bases = [...new Set(sources.map((s) => slugifyUsername(s ?? "")).filter(Boolean))];
  if (bases.length === 0) return [];

  const candidates: string[] = [];
  for (const base of bases) {
    candidates.push(base);
    // Truncate before appending so a 20-char base still fits the suffix
    for (const suffix of ["1", "_nfc", String(new Date().getFullYear())]) {
      candidates.push(base.slice(0, USERNAME_MAX - suffix.length) + suffix);
    }
  }
  return [...new Set(candidates)].filter((c) => USERNAME_RE.test(c));
}

// The part of an email before the @, used only to *prefill* an editable field.
// Deliberately never used as an automatic public byline — see resolveUsername
// in lib/server-queries.ts, which stops at displayName.
export function emailLocalPart(email: string | null | undefined): string {
  return email?.split("@")[0] ?? "";
}
