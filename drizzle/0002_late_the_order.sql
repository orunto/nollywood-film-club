ALTER TABLE "user_profiles" RENAME TO "usernames";--> statement-breakpoint
ALTER TABLE "usernames" DROP CONSTRAINT "user_profiles_stack_user_id_unique";--> statement-breakpoint
ALTER TABLE "usernames" DROP CONSTRAINT "user_profiles_username_unique";--> statement-breakpoint
ALTER TABLE "user_ratings" DROP CONSTRAINT "user_ratings_user_id_user_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "user_ratings" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_ratings" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "usernames" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "usernames" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "usernames" DROP COLUMN "profile_image";--> statement-breakpoint
ALTER TABLE "usernames" DROP COLUMN "bio";--> statement-breakpoint
ALTER TABLE "usernames" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "usernames" ADD CONSTRAINT "usernames_stack_user_id_unique" UNIQUE("stack_user_id");--> statement-breakpoint
ALTER TABLE "usernames" ADD CONSTRAINT "usernames_username_unique" UNIQUE("username");