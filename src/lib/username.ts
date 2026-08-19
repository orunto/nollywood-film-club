// Portable copy of the legacy lib/username.ts, shared by the onboarding page
// and the two username API routes so the rule can only change in one place.

export const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export function slugifyUsername(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, USERNAME_MAX);

  return slug.length >= USERNAME_MIN ? slug : "";
}

export function usernameSuggestions(
  sources: (string | null | undefined)[],
): string[] {
  const bases = [
    ...new Set(
      sources.map((source) => slugifyUsername(source ?? "")).filter(Boolean),
    ),
  ];
  if (bases.length === 0) return [];

  const candidates: string[] = [];
  for (const base of bases) {
    candidates.push(base);
    for (const suffix of ["1", "_nfc", String(new Date().getFullYear())]) {
      candidates.push(base.slice(0, USERNAME_MAX - suffix.length) + suffix);
    }
  }
  return [...new Set(candidates)].filter((candidate) =>
    USERNAME_RE.test(candidate),
  );
}

export function emailLocalPart(email: string | null | undefined): string {
  return email?.split("@")[0] ?? "";
}