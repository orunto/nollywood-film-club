CREATE TYPE "public"."contact_category" AS ENUM('bug', 'improvement', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "contact_category" NOT NULL,
	"message" text NOT NULL,
	"email" text,
	"user_id" text,
	"status" "contact_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_messages_status_idx" ON "contact_messages" USING btree ("status");
