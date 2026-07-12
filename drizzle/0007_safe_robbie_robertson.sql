CREATE TABLE "discussions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content_id" uuid,
	"space_url" text,
	"podcast_links" text[],
	"episode_number" integer,
	"discussion_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_ratings" ADD COLUMN "flagged" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_ratings" ADD COLUMN "restricted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discussions_episode_number_unique" ON "discussions" USING btree ("episode_number") WHERE "discussions"."episode_number" IS NOT NULL;