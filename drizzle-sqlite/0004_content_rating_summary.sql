CREATE TABLE `content_rating_summary` (
	`content_id` text PRIMARY KEY NOT NULL,
	`rating_count` integer NOT NULL DEFAULT 0,
	`rating_total` integer NOT NULL DEFAULT 0,
	`average_rating` real,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`content_id`) REFERENCES `content`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
SELECT
	`content_id`,
	COUNT(*),
	COALESCE(SUM(`rating`), 0),
	AVG(`rating`),
	CAST((unixepoch() * 1000) AS integer)
FROM `user_ratings`
WHERE `restricted` = 0
GROUP BY `content_id`;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_insert_summary`
AFTER INSERT ON `user_ratings`
WHEN NEW.`restricted` = 0
BEGIN
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  VALUES (NEW.`content_id`, 1, NEW.`rating`, CAST(NEW.`rating` AS REAL), NEW.`updated_at`)
  ON CONFLICT(`content_id`) DO UPDATE SET
    `rating_count` = `content_rating_summary`.`rating_count` + 1,
    `rating_total` = `content_rating_summary`.`rating_total` + excluded.`rating_total`,
    `average_rating` = CAST((`content_rating_summary`.`rating_total` + excluded.`rating_total`) AS REAL) / (`content_rating_summary`.`rating_count` + 1),
    `updated_at` = excluded.`updated_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_delete_summary`
AFTER DELETE ON `user_ratings`
WHEN OLD.`restricted` = 0
BEGIN
  UPDATE `content_rating_summary` SET
    `rating_count` = `rating_count` - 1,
    `rating_total` = `rating_total` - OLD.`rating`,
    `average_rating` = CASE WHEN `rating_count` - 1 = 0 THEN NULL ELSE CAST((`rating_total` - OLD.`rating`) AS REAL) / (`rating_count` - 1) END,
    `updated_at` = CAST((unixepoch() * 1000) AS integer)
  WHERE `content_id` = OLD.`content_id`;
  DELETE FROM `content_rating_summary` WHERE `content_id` = OLD.`content_id` AND `rating_count` = 0;
END;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_update_rating_summary`
AFTER UPDATE OF `rating` ON `user_ratings`
WHEN NEW.`rating` != OLD.`rating` AND NEW.`content_id` = OLD.`content_id` AND OLD.`restricted` = 0 AND NEW.`restricted` = 0
BEGIN
  UPDATE `content_rating_summary` SET
    `rating_total` = `rating_total` + (NEW.`rating` - OLD.`rating`),
    `average_rating` = CAST((`rating_total` + (NEW.`rating` - OLD.`rating`)) AS REAL) / `rating_count`,
    `updated_at` = NEW.`updated_at`
  WHERE `content_id` = NEW.`content_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_update_content_summary`
AFTER UPDATE OF `content_id` ON `user_ratings`
WHEN NEW.`content_id` != OLD.`content_id` AND OLD.`restricted` = 0 AND NEW.`restricted` = 0
BEGIN
  UPDATE `content_rating_summary` SET
    `rating_count` = `rating_count` - 1,
    `rating_total` = `rating_total` - OLD.`rating`,
    `average_rating` = CASE WHEN `rating_count` - 1 = 0 THEN NULL ELSE CAST((`rating_total` - OLD.`rating`) AS REAL) / (`rating_count` - 1) END,
    `updated_at` = CAST((unixepoch() * 1000) AS integer)
  WHERE `content_id` = OLD.`content_id`;
  DELETE FROM `content_rating_summary` WHERE `content_id` = OLD.`content_id` AND `rating_count` = 0;
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  VALUES (NEW.`content_id`, 1, NEW.`rating`, CAST(NEW.`rating` AS REAL), NEW.`updated_at`)
  ON CONFLICT(`content_id`) DO UPDATE SET
    `rating_count` = `content_rating_summary`.`rating_count` + 1,
    `rating_total` = `content_rating_summary`.`rating_total` + excluded.`rating_total`,
    `average_rating` = CAST((`content_rating_summary`.`rating_total` + excluded.`rating_total`) AS REAL) / (`content_rating_summary`.`rating_count` + 1),
    `updated_at` = excluded.`updated_at`;
END;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_update_restricted_on_summary`
AFTER UPDATE OF `restricted` ON `user_ratings`
WHEN NEW.`restricted` != OLD.`restricted` AND NEW.`content_id` = OLD.`content_id`
BEGIN
  UPDATE `content_rating_summary` SET
    `rating_count` = CASE WHEN NEW.`restricted` = 1 THEN `rating_count` - 1 ELSE `rating_count` + 1 END,
    `rating_total` = CASE WHEN NEW.`restricted` = 1 THEN `rating_total` - NEW.`rating` ELSE `rating_total` + NEW.`rating` END,
    `average_rating` = CASE 
      WHEN NEW.`restricted` = 1 AND `rating_count` - 1 = 0 THEN NULL
      WHEN NEW.`restricted` = 1 THEN CAST((`rating_total` - NEW.`rating`) AS REAL) / (`rating_count` - 1)
      ELSE CAST((`rating_total` + NEW.`rating`) AS REAL) / (`rating_count` + 1)
    END,
    `updated_at` = NEW.`updated_at`
  WHERE `content_id` = NEW.`content_id`;
  DELETE FROM `content_rating_summary` WHERE `content_id` = NEW.`content_id` AND `rating_count` = 0;
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  SELECT NEW.`content_id`, 1, NEW.`rating`, CAST(NEW.`rating` AS REAL), NEW.`updated_at`
  WHERE NEW.`restricted` = 0 AND NOT EXISTS (SELECT 1 FROM `content_rating_summary` WHERE `content_id` = NEW.`content_id`);
END;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_update_restricted_content_summary`
AFTER UPDATE OF `restricted`, `content_id` ON `user_ratings`
WHEN NEW.`restricted` != OLD.`restricted` AND NEW.`content_id` != OLD.`content_id`
BEGIN
  UPDATE `content_rating_summary` SET
    `rating_count` = CASE WHEN OLD.`restricted` = 0 THEN `rating_count` - 1 ELSE `rating_count` END,
    `rating_total` = CASE WHEN OLD.`restricted` = 0 THEN `rating_total` - OLD.`rating` ELSE `rating_total` END,
    `average_rating` = CASE 
      WHEN OLD.`restricted` = 0 AND `rating_count` - 1 = 0 THEN NULL
      WHEN OLD.`restricted` = 0 THEN CAST((`rating_total` - OLD.`rating`) AS REAL) / (`rating_count` - 1)
      ELSE `average_rating`
    END,
    `updated_at` = CAST((unixepoch() * 1000) AS integer)
  WHERE `content_id` = OLD.`content_id`;
  DELETE FROM `content_rating_summary` WHERE `content_id` = OLD.`content_id` AND `rating_count` = 0;
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  VALUES (NEW.`content_id`, 1, NEW.`rating`, CAST(NEW.`rating` AS REAL), NEW.`updated_at`)
  ON CONFLICT(`content_id`) DO UPDATE SET
    `rating_count` = CASE WHEN NEW.`restricted` = 0 THEN `content_rating_summary`.`rating_count` + 1 ELSE `content_rating_summary`.`rating_count` END,
    `rating_total` = CASE WHEN NEW.`restricted` = 0 THEN `content_rating_summary`.`rating_total` + excluded.`rating_total` ELSE `content_rating_summary`.`rating_total` END,
    `average_rating` = CASE WHEN NEW.`restricted` = 0 THEN CAST((`content_rating_summary`.`rating_total` + excluded.`rating_total`) AS REAL) / (`content_rating_summary`.`rating_count` + 1) ELSE `content_rating_summary`.`average_rating` END,
    `updated_at` = excluded.`updated_at`
  WHERE NEW.`restricted` = 0;
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  SELECT NEW.`content_id`, 0, 0, NULL, CAST((unixepoch() * 1000) AS integer)
  WHERE NEW.`restricted` = 1 AND NOT EXISTS (SELECT 1 FROM `content_rating_summary` WHERE `content_id` = NEW.`content_id`);
END;
