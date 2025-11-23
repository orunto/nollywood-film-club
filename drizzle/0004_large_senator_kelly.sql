ALTER TABLE "usernames" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "usernames" CASCADE;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "score" SET DATA TYPE numeric(3, 1);--> statement-breakpoint
ALTER TABLE "user_ratings" ALTER COLUMN "rating" SET DATA TYPE integer;