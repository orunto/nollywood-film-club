import type { CastMember } from "@/db/schema";

// Cast can arrive from a JustWatch import or be typed by hand in the admin form,
// where a half-filled row is normal: someone clicks "Actor", then saves before
// naming them. Drop those rather than storing blanks, and keep directors'
// characterName null since they do not play anyone.
export function sanitizeCastMembers(input: unknown): CastMember[] | null {
  if (!Array.isArray(input)) return null;

  const cleaned = input.flatMap((raw): CastMember[] => {
    if (!raw || typeof raw !== "object") return [];
    const { role, name, characterName } = raw as Record<string, unknown>;
    if (role !== "actor" && role !== "director") return [];
    if (typeof name !== "string" || !name.trim()) return [];

    const character =
      role === "actor" && typeof characterName === "string" && characterName.trim()
        ? characterName.trim()
        : null;

    return [{ role, name: name.trim(), characterName: character }];
  });

  return cleaned.length > 0 ? cleaned : null;
}
