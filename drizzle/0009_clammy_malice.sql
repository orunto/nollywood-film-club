CREATE TYPE "public"."report_reason" AS ENUM('spoiler', 'harassment', 'spam', 'off_topic', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target" AS ENUM('review', 'pushback');--> statement-breakpoint
CREATE TABLE "pushbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"parent_id" uuid,
	"user_id" text NOT NULL,
	"body" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"flagged" boolean DEFAULT false,
	"restricted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" "report_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" "report_reason" NOT NULL,
	"note" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pushbacks" ADD CONSTRAINT "pushbacks_review_id_user_ratings_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."user_ratings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pushbacks" ADD CONSTRAINT "pushbacks_parent_id_pushbacks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pushbacks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pushbacks_review_id_idx" ON "pushbacks" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "pushbacks_parent_id_idx" ON "pushbacks" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_reporter_target_unique" ON "reports" USING btree ("reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");