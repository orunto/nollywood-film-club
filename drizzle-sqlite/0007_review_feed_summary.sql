CREATE TABLE `review_feed_summary` (
	`review_id` text PRIMARY KEY NOT NULL,
	`comment_count` integer NOT NULL DEFAULT 0,
	`last_activity_at` integer NOT NULL,
	`visible` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `user_ratings`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `review_feed_summary_visible_check` CHECK(`visible` IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `review_feed_summary_visible_last_activity_idx` ON `review_feed_summary` (`visible`, `last_activity_at` DESC);
--> statement-breakpoint
INSERT INTO `review_feed_summary` (`review_id`, `comment_count`, `last_activity_at`, `visible`)
SELECT
	`ur`.`id`,
	COALESCE(`c`.`comment_count`, 0),
	COALESCE(`c`.`last_comment_at`, `ur`.`created_at`),
	CASE WHEN `ur`.`restricted` = 0 AND `ur`.`review` IS NOT NULL AND `ur`.`review` <> '' THEN 1 ELSE 0 END
FROM `user_ratings` `ur`
LEFT JOIN (
	SELECT `review_id`, COUNT(*) AS `comment_count`, MAX(`created_at`) AS `last_comment_at`
	FROM `comments`
	WHERE `restricted` = 0
	GROUP BY `review_id`
) `c` ON `c`.`review_id` = `ur`.`id`
WHERE `ur`.`review` IS NOT NULL AND `ur`.`review` <> '';
--> statement-breakpoint
CREATE TRIGGER `review_feed_summary_after_user_rating_insert`
AFTER INSERT ON `user_ratings`
WHEN NEW.`review` IS NOT NULL AND NEW.`review` <> ''
BEGIN
  INSERT INTO `review_feed_summary` (`review_id`, `comment_count`, `last_activity_at`, `visible`)
  VALUES (
    NEW.`id`,
    0,
    NEW.`created_at`,
    CASE WHEN NEW.`restricted` = 0 THEN 1 ELSE 0 END
  );
END;
--> statement-breakpoint
CREATE TRIGGER `review_feed_summary_after_user_rating_update_review`
AFTER UPDATE OF `review`, `restricted` ON `user_ratings`
BEGIN
  DELETE FROM `review_feed_summary` WHERE `review_id` = NEW.`id` AND (NEW.`review` IS NULL OR NEW.`review` = '');
  INSERT INTO `review_feed_summary` (`review_id`, `comment_count`, `last_activity_at`, `visible`)
  SELECT NEW.`id`, COALESCE((SELECT COUNT(*) FROM `comments` WHERE `review_id` = NEW.`id` AND `restricted` = 0), 0),
    COALESCE((SELECT MAX(`created_at`) FROM `comments` WHERE `review_id` = NEW.`id` AND `restricted` = 0), NEW.`created_at`),
    CASE WHEN NEW.`restricted` = 0 AND NEW.`review` IS NOT NULL AND NEW.`review` <> '' THEN 1 ELSE 0 END
  WHERE NEW.`review` IS NOT NULL AND NEW.`review` <> ''
  ON CONFLICT(`review_id`) DO UPDATE SET
    `comment_count` = excluded.`comment_count`,
    `last_activity_at` = excluded.`last_activity_at`,
    `visible` = excluded.`visible`;
  UPDATE `review_feed_summary` SET
    `visible` = CASE WHEN NEW.`restricted` = 0 AND NEW.`review` IS NOT NULL AND NEW.`review` <> '' THEN 1 ELSE 0 END
  WHERE `review_id` = NEW.`id` AND (NEW.`review` IS NULL OR NEW.`review` = '');
END;
--> statement-breakpoint
CREATE TRIGGER `review_feed_summary_after_user_rating_delete`
AFTER DELETE ON `user_ratings`
BEGIN
  DELETE FROM `review_feed_summary` WHERE `review_id` = OLD.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `review_feed_after_comment_insert`
AFTER INSERT ON `comments`
WHEN NEW.`restricted` = 0
BEGIN
  UPDATE `review_feed_summary` SET
    `comment_count` = `comment_count` + 1,
    `last_activity_at` = CASE WHEN NEW.`created_at` > `last_activity_at` THEN NEW.`created_at` ELSE `last_activity_at` END
  WHERE `review_id` = NEW.`review_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `review_feed_after_comment_delete`
AFTER DELETE ON `comments`
WHEN OLD.`restricted` = 0
BEGIN
  UPDATE `review_feed_summary` SET
    `comment_count` = `comment_count` - 1,
    `last_activity_at` = COALESCE((SELECT MAX(`created_at`) FROM `comments` WHERE `review_id` = OLD.`review_id` AND `restricted` = 0), (SELECT `created_at` FROM `user_ratings` WHERE `id` = OLD.`review_id`))
  WHERE `review_id` = OLD.`review_id`;
END;
--> statement-breakpoint
CREATE TRIGGER `review_feed_after_comment_update_restricted`
AFTER UPDATE OF `restricted` ON `comments`
WHEN NEW.`restricted` != OLD.`restricted`
BEGIN
  UPDATE `review_feed_summary` SET
    `comment_count` = CASE WHEN NEW.`restricted` = 1 THEN `comment_count` - 1 ELSE `comment_count` + 1 END,
    `last_activity_at` = CASE
      WHEN NEW.`restricted` = 0 AND NEW.`created_at` > `last_activity_at` THEN NEW.`created_at`
      WHEN NEW.`restricted` = 1 THEN COALESCE((SELECT MAX(`created_at`) FROM `comments` WHERE `review_id` = NEW.`review_id` AND `restricted` = 0), (SELECT `created_at` FROM `user_ratings` WHERE `id` = NEW.`review_id`))
      ELSE `last_activity_at`
    END
  WHERE `review_id` = NEW.`review_id`;
END;
