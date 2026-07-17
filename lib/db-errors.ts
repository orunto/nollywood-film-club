const UNIQUE_VIOLATION = "23505";

// Drizzle wraps driver errors, so the pg error can sit on the thrown object or
// on its cause. Walk the chain rather than guessing which one we got.
function pgError(error: unknown): { code?: string; constraint?: string } | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current === "object" && "code" in current) {
      return current as { code?: string; constraint?: string };
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

// True when a write collided with discussions_episode_number_unique — i.e. the
// episode number is already taken.
export function isDuplicateEpisodeNumber(error: unknown): boolean {
  const pg = pgError(error);
  return (
    pg?.code === UNIQUE_VIOLATION &&
    pg?.constraint === "discussions_episode_number_unique"
  );
}
