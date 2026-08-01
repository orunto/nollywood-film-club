-- Local mirror of Stack Auth's id -> username. Stack has no notion of
-- username uniqueness (it lives in freeform clientMetadata); this table is
-- the actual source of truth for that guarantee and for indexed
-- /members/[username] lookups. Not FK'd to user_ratings/comments.user_id.
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_lower_unique" ON "users" USING btree (lower("username"));
