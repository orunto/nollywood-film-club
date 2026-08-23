import type { AtomicCommand, AtomicResult } from "../services/contracts";

export interface CatalogWriteAccess {
  publicReads: {
    contentExists(id: string): Promise<boolean>;
  };
  atomic(commands: AtomicCommand[]): Promise<AtomicResult[]>;
}

export function catalogNumberSyncCommand(
  contentIds: (string | null | undefined)[],
  now = Date.now(),
): AtomicCommand | null {
  const ids = [
    ...new Set(contentIds.filter((id): id is string => Boolean(id))),
  ];
  if (ids.length === 0) return null;

  const placeholders = ids.map(() => "?").join(", ");
  return {
    sql: `
      UPDATE content
      SET catalog_number = (
        SELECT MIN(discussions.episode_number)
        FROM discussion_content
        INNER JOIN discussions
          ON discussions.id = discussion_content.discussion_id
        WHERE discussion_content.content_id = content.id
      ),
      updated_at = ?
      WHERE id IN (${placeholders})
    `,
    params: [now, ...ids],
  };
}

export function allCatalogNumbersSyncCommand(now = Date.now()): AtomicCommand {
  const catalogNumber = `
    SELECT MIN(discussions.episode_number)
    FROM discussion_content
    INNER JOIN discussions
      ON discussions.id = discussion_content.discussion_id
    WHERE discussion_content.content_id = content.id
  `;
  return {
    sql: `
      UPDATE content
      SET catalog_number = (${catalogNumber}), updated_at = ?
      WHERE catalog_number IS NOT (${catalogNumber})
    `,
    params: [now],
  };
}

export class CatalogWriteRepository {
  constructor(private readonly access: CatalogWriteAccess) {}

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

  async syncCatalogNumbers(
    contentIds: (string | null | undefined)[],
  ): Promise<void> {
    const command = catalogNumberSyncCommand(contentIds);
    if (command) await this.access.atomic([command]);
  }
}
