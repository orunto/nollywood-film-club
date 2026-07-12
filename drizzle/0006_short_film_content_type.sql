ALTER TYPE "public"."content_type" ADD VALUE IF NOT EXISTS 'short_film';--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "catalog_number" integer;--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN IF EXISTS "space_url";--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN IF EXISTS "podcast_links";
