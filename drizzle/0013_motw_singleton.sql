-- The content form's POST/PUT wrote is_movie_of_the_week straight through with
-- no demotion, so more than one row can already be true. Keep the most recently
-- updated pick and demote the rest, otherwise the index below cannot be built.
UPDATE "content" SET "is_movie_of_the_week" = false
WHERE "is_movie_of_the_week" = true
  AND "id" <> (
    SELECT "id" FROM "content" WHERE "is_movie_of_the_week" = true
    ORDER BY "updated_at" DESC NULLS LAST LIMIT 1
  );--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "motw_singleton" ON "content" ("is_movie_of_the_week") WHERE "is_movie_of_the_week";
