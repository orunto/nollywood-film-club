CREATE INDEX `user_ratings_content_created_at_idx` ON `user_ratings` (`content_id`, `created_at`);
--> statement-breakpoint
CREATE INDEX `user_ratings_content_visible_created_at_idx` ON `user_ratings` (`content_id`, `restricted`, `created_at`);
