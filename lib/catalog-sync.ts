import { db } from "@/db/client";
import { sql } from "drizzle-orm";

// content.catalog_number is derived, never typed by an admin: it's the
// MIN(episode_number) across whatever discussion(s) are currently linked to
// that content row, or NULL if none are linked (sorts last via the existing
// `catalog_number DESC NULLS LAST` convention). Call this after any write to
// `discussions` that could change a content row's linked episode(s) — create,
// update, link/unlink (PATCH), or delete — passing every content_id touched
// by the write (both the old and new content_id, if a discussion was moved
// or unlinked).
export async function syncCatalogNumbers(
  contentIds: (string | null | undefined)[],
): Promise<void> {
  const ids = [...new Set(contentIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return;

  await Promise.all(
    ids.map((id) =>
      db.execute(sql`
        UPDATE "content"
        SET "catalog_number" = (
          SELECT MIN("episode_number") FROM "discussions" WHERE "discussions"."content_id" = ${id}
        ),
        "updated_at" = now()
        WHERE "id" = ${id}
      `),
    ),
  );
}
