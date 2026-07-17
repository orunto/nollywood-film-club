CREATE TYPE "public"."viewing_category" AS ENUM('in_cinemas', 'streaming', 'coming_to_cinemas', 'coming_to_streaming', 'unavailable');--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "viewing_category" "viewing_category";--> statement-breakpoint
UPDATE "content" SET "viewing_category" = 'streaming' WHERE "streaming_platform" IS NOT NULL;
