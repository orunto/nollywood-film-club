CREATE TABLE `__discussion_content_backfill` (
	`discussion_id` text NOT NULL,
	`content_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__discussion_content_backfill` (`discussion_id`, `content_id`)
SELECT `id`, `content_id`
FROM `discussions`
WHERE `content_id` IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `__new_discussions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`space_url` text,
	`podcast_links` text DEFAULT '[]' NOT NULL,
	`episode_number` integer,
	`discussion_date` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "discussions_podcast_links_json_check" CHECK(json_valid("__new_discussions"."podcast_links") AND json_type("__new_discussions"."podcast_links") = 'array')
);
--> statement-breakpoint
INSERT INTO `__new_discussions` (`id`, `title`, `description`, `space_url`, `podcast_links`, `episode_number`, `discussion_date`, `created_at`, `updated_at`)
SELECT `id`, `title`, `description`, `space_url`, `podcast_links`, `episode_number`, `discussion_date`, `created_at`, `updated_at`
FROM `discussions`;
--> statement-breakpoint
DROP TABLE `discussions`;
--> statement-breakpoint
ALTER TABLE `__new_discussions` RENAME TO `discussions`;
--> statement-breakpoint
CREATE UNIQUE INDEX `discussions_episode_number_unique` ON `discussions` (`episode_number`) WHERE "discussions"."episode_number" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE `discussion_content` (
	`discussion_id` text NOT NULL,
	`content_id` text NOT NULL,
	PRIMARY KEY(`discussion_id`, `content_id`),
	FOREIGN KEY (`discussion_id`) REFERENCES `discussions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `discussion_content` (`discussion_id`, `content_id`)
SELECT `discussion_id`, `content_id`
FROM `__discussion_content_backfill`;
--> statement-breakpoint
DROP TABLE `__discussion_content_backfill`;
--> statement-breakpoint
CREATE INDEX `discussion_content_content_id_idx` ON `discussion_content` (`content_id`);
