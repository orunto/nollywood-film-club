CREATE TABLE `cache_versions` (
	`key` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL DEFAULT 1,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `cache_versions` (`key`, `version`, `updated_at`) VALUES
	('catalog', 1, CAST((unixepoch() * 1000) AS integer)),
	('scoreboard', 1, CAST((unixepoch() * 1000) AS integer)),
	('content', 1, CAST((unixepoch() * 1000) AS integer)),
	('discussions', 1, CAST((unixepoch() * 1000) AS integer)),
	('feed', 1, CAST((unixepoch() * 1000) AS integer)),
	('members', 1, CAST((unixepoch() * 1000) AS integer));
