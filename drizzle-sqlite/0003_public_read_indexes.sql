CREATE INDEX `users_regular_created_at_idx` ON `users` (`regular`,`created_at`);
--> statement-breakpoint
CREATE INDEX `user_ratings_user_visible_created_at_idx` ON `user_ratings` (`user_id`,`restricted`,`created_at` DESC);
--> statement-breakpoint
CREATE INDEX `user_ratings_visible_review_created_at_idx` ON `user_ratings` (`created_at` DESC) WHERE `restricted` = 0 AND `review` IS NOT NULL AND `review` <> '';
--> statement-breakpoint
CREATE INDEX `comments_review_visible_created_at_idx` ON `comments` (`review_id`,`restricted`,`created_at`);
