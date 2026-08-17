CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_unique` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `accounts_user_id_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`slug` text NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "blog_posts_published_check" CHECK("blog_posts"."published" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_unique` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`parent_id` text,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`restricted` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `user_ratings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "comments_depth_check" CHECK("comments"."depth" BETWEEN 0 AND 5),
	CONSTRAINT "comments_flagged_check" CHECK("comments"."flagged" IN (0, 1)),
	CONSTRAINT "comments_restricted_check" CHECK("comments"."restricted" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `comments_review_id_idx` ON `comments` (`review_id`);--> statement-breakpoint
CREATE INDEX `comments_parent_id_idx` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`email` text,
	`user_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT "contact_messages_category_check" CHECK("contact_messages"."category" IN ('bug', 'improvement', 'other')),
	CONSTRAINT "contact_messages_status_check" CHECK("contact_messages"."status" IN ('open', 'actioned', 'dismissed'))
);
--> statement-breakpoint
CREATE INDEX `contact_messages_status_idx` ON `contact_messages` (`status`);--> statement-breakpoint
CREATE TABLE `content` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content_type` text NOT NULL,
	`runtime` integer,
	`release_date` integer,
	`rating` text,
	`synopsis` text,
	`genre` text DEFAULT '[]' NOT NULL,
	`poster_media_id` text,
	`poster_image` text,
	`poster_version` integer,
	`trailer_url` text,
	`streaming_url` text,
	`streaming_platform` text,
	`other_platform` text,
	`viewing_category` text,
	`cast_members` text,
	`is_movie_of_the_week` integer DEFAULT false NOT NULL,
	`catalog_number` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`poster_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "content_type_check" CHECK("content"."content_type" IN ('movie', 'tv_show', 'short_film')),
	CONSTRAINT "content_rating_check" CHECK("content"."rating" IS NULL OR "content"."rating" IN ('G', 'PG', 'PG-13', '13', 'R', '16', 'NC-17', '18+', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA')),
	CONSTRAINT "content_streaming_platform_check" CHECK("content"."streaming_platform" IS NULL OR "content"."streaming_platform" IN ('netflix', 'prime_video', 'youtube', 'disney_plus', 'hulu', 'hbo_max', 'apple_tv', 'paramount_plus', 'peacock', 'other')),
	CONSTRAINT "content_viewing_category_check" CHECK("content"."viewing_category" IS NULL OR "content"."viewing_category" IN ('in_cinemas', 'streaming', 'coming_to_cinemas', 'coming_to_streaming', 'unavailable')),
	CONSTRAINT "content_genre_json_check" CHECK(json_valid("content"."genre") AND json_type("content"."genre") = 'array'),
	CONSTRAINT "content_cast_members_json_check" CHECK("content"."cast_members" IS NULL OR (json_valid("content"."cast_members") AND json_type("content"."cast_members") = 'array')),
	CONSTRAINT "content_motw_check" CHECK("content"."is_movie_of_the_week" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `motw_singleton` ON `content` (`is_movie_of_the_week`) WHERE "content"."is_movie_of_the_week" = 1;--> statement-breakpoint
CREATE INDEX `content_poster_media_id_idx` ON `content` (`poster_media_id`);--> statement-breakpoint
CREATE TABLE `discussions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`content_id` text,
	`space_url` text,
	`podcast_links` text DEFAULT '[]' NOT NULL,
	`episode_number` integer,
	`discussion_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "discussions_podcast_links_json_check" CHECK(json_valid("discussions"."podcast_links") AND json_type("discussions"."podcast_links") = 'array')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discussions_episode_number_unique` ON `discussions` (`episode_number`) WHERE "discussions"."episode_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `discussions_content_id_idx` ON `discussions` (`content_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`public_id` text NOT NULL,
	`version` integer NOT NULL,
	`mime_type` text NOT NULL,
	`width` integer,
	`height` integer,
	`byte_size` integer,
	`checksum` text,
	`status` text DEFAULT 'staged' NOT NULL,
	`original_provider` text,
	`original_metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "media_version_check" CHECK("media"."version" >= 1),
	CONSTRAINT "media_dimensions_check" CHECK(("media"."width" IS NULL OR "media"."width" > 0) AND ("media"."height" IS NULL OR "media"."height" > 0)),
	CONSTRAINT "media_byte_size_check" CHECK("media"."byte_size" IS NULL OR "media"."byte_size" >= 0),
	CONSTRAINT "media_status_check" CHECK("media"."status" IN ('staged', 'ready', 'missing')),
	CONSTRAINT "media_original_metadata_json_check" CHECK("media"."original_metadata" IS NULL OR json_valid("media"."original_metadata"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_object_key_unique` ON `media` (`object_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_public_id_version_unique` ON `media` (`public_id`,`version`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reporter_id` text NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT "reports_target_type_check" CHECK("reports"."target_type" IN ('review', 'comment')),
	CONSTRAINT "reports_reason_check" CHECK("reports"."reason" IN ('spoiler', 'harassment', 'spam', 'off_topic', 'other')),
	CONSTRAINT "reports_status_check" CHECK("reports"."status" IN ('open', 'actioned', 'dismissed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_reporter_target_unique` ON `reports` (`reporter_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`score_tenths` integer,
	`reviewer` text NOT NULL,
	`external_url` text,
	`review_media_id` text,
	`review_image` text,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`review_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "reviews_score_tenths_check" CHECK("reviews"."score_tenths" IS NULL OR "reviews"."score_tenths" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE INDEX `reviews_content_id_idx` ON `reviews` (`content_id`);--> statement-breakpoint
CREATE INDEX `reviews_review_media_id_idx` ON `reviews` (`review_media_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`content_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer NOT NULL,
	`review` text,
	`edited` integer DEFAULT false NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`restricted` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_ratings_rating_check" CHECK("user_ratings"."rating" IN (0, 5, 10)),
	CONSTRAINT "user_ratings_edited_check" CHECK("user_ratings"."edited" IN (0, 1)),
	CONSTRAINT "user_ratings_flagged_check" CHECK("user_ratings"."flagged" IN (0, 1)),
	CONSTRAINT "user_ratings_restricted_check" CHECK("user_ratings"."restricted" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_ratings_content_user_unique` ON `user_ratings` (`content_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`username` text,
	`role` text DEFAULT 'user' NOT NULL,
	`regular` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "users_role_check" CHECK("users"."role" IN ('user', 'admin')),
	CONSTRAINT "users_email_verified_check" CHECK("users"."email_verified" IN (0, 1)),
	CONSTRAINT "users_regular_check" CHECK("users"."regular" IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_lower_unique` ON `users` (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_lower_unique` ON `users` (lower("username"));--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);
--> statement-breakpoint
CREATE TABLE `account_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_claims_token_hash_unique` ON `account_claims` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `account_claims_user_id_idx` ON `account_claims` (`user_id`);
