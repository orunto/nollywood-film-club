-- The first backfill only inserted accounts that already had a username,
-- leaving accounts without one (e.g. Iroko Critic) with no local row at all.
-- username needs to be nullable so every account can be mirrored, with a
-- null username meaning "no profile link" rather than "no row".
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
