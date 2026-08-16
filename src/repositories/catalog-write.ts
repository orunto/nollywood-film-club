import type { AtomicCommand, AtomicResult } from "../services/contracts";

export interface CatalogWriteAccess {
  publicReads: {
    contentExists(id: string): Promise<boolean>;
  };
  atomic(commands: AtomicCommand[]): Promise<AtomicResult[]>;
}

export class CatalogWriteRepository {
  constructor(private readonly access: CatalogWriteAccess) {}

  // is_movie_of_the_week is a singleton via the partial motw_singleton index:
  // promoting one film must demote every other in the same transaction, and
  // demote-then-promote is the only order the index tolerates. Promoting a film
  // that is already the current pick leaves it untouched via the id exclusion.
  async setMovieOfTheWeek(
    id: string,
    promote: boolean,
  ): Promise<{ status: "ok" } | { status: "movie-missing" }> {
    if (!(await this.access.publicReads.contentExists(id))) {
      return { status: "movie-missing" };
    }

    const now = Date.now();
    await this.access.atomic([
      {
        sql: `
          UPDATE content
          SET is_movie_of_the_week = 0, updated_at = ?
          WHERE is_movie_of_the_week = 1 AND id != ?
        `,
        params: [now, id],
      },
      {
        sql: `
          UPDATE content
          SET is_movie_of_the_week = ?, updated_at = ?
          WHERE id = ?
        `,
        params: [promote ? 1 : 0, now, id],
      },
    ]);

    return { status: "ok" };
  }

  // Recomputes catalog_number as MIN(episode_number) across whatever
  // discussions are currently linked to each content row (NULL when none, so
  // it sorts last). Call after any discussion write that changes a content
  // row's linked episode(s), passing every content_id touched by the write.
  async syncCatalogNumbers(
    contentIds: (string | null | undefined)[],
  ): Promise<void> {
    const ids = [
      ...new Set(contentIds.filter((id): id is string => Boolean(id))),
    ];
    if (ids.length === 0) return;

    const placeholders = ids.map(() => "?").join(", ");
    await this.access.atomic([
      {
        sql: `
          UPDATE content
          SET catalog_number = (
            SELECT MIN(episode_number)
            FROM discussions
            WHERE discussions.content_id = content.id
          ),
          updated_at = ?
          WHERE id IN (${placeholders})
        `,
        params: [Date.now(), ...ids],
      },
    ]);
  }
}