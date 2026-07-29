-- "Pushback" implied every reply had to be a disagreement. They are comments.
-- Pure rename: no columns change, no rows move. ALTER TYPE ... RENAME VALUE
-- rewrites reports.target_type in place, so there is no backfill either.
ALTER TABLE "pushbacks" RENAME TO "comments";--> statement-breakpoint
ALTER INDEX "pushbacks_pkey" RENAME TO "comments_pkey";--> statement-breakpoint
ALTER INDEX "pushbacks_review_id_idx" RENAME TO "comments_review_id_idx";--> statement-breakpoint
ALTER INDEX "pushbacks_parent_id_idx" RENAME TO "comments_parent_id_idx";--> statement-breakpoint
ALTER TABLE "comments" RENAME CONSTRAINT "pushbacks_review_id_user_ratings_id_fk" TO "comments_review_id_user_ratings_id_fk";--> statement-breakpoint
ALTER TABLE "comments" RENAME CONSTRAINT "pushbacks_parent_id_pushbacks_id_fk" TO "comments_parent_id_comments_id_fk";--> statement-breakpoint
ALTER TYPE "public"."report_target" RENAME VALUE 'pushback' TO 'comment';
