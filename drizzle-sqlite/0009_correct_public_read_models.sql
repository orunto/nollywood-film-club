DROP TRIGGER `content_slug_auto_insert`;
--> statement-breakpoint
DROP TRIGGER `content_slug_auto_update`;
--> statement-breakpoint
DROP TRIGGER `user_ratings_after_insert_summary`;
--> statement-breakpoint
DROP TRIGGER `user_ratings_after_delete_summary`;
--> statement-breakpoint
DROP TRIGGER `user_ratings_after_update_rating_summary`;
--> statement-breakpoint
DROP TRIGGER `user_ratings_after_update_content_summary`;
--> statement-breakpoint
DROP TRIGGER `user_ratings_after_update_restricted_on_summary`;
--> statement-breakpoint
DROP TRIGGER `user_ratings_after_update_restricted_content_summary`;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_insert_summary`
AFTER INSERT ON `user_ratings`
BEGIN
  DELETE FROM `content_rating_summary` WHERE `content_id` = NEW.`content_id`;
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  SELECT NEW.`content_id`, COUNT(*), COALESCE(SUM(`rating`), 0), AVG(`rating`), CAST((unixepoch() * 1000) AS integer)
  FROM `user_ratings`
  WHERE `content_id` = NEW.`content_id` AND `restricted` = 0
  HAVING COUNT(*) > 0;
END;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_delete_summary`
AFTER DELETE ON `user_ratings`
BEGIN
  DELETE FROM `content_rating_summary` WHERE `content_id` = OLD.`content_id`;
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  SELECT OLD.`content_id`, COUNT(*), COALESCE(SUM(`rating`), 0), AVG(`rating`), CAST((unixepoch() * 1000) AS integer)
  FROM `user_ratings`
  WHERE `content_id` = OLD.`content_id` AND `restricted` = 0
  HAVING COUNT(*) > 0;
END;
--> statement-breakpoint
CREATE TRIGGER `user_ratings_after_update_summary`
AFTER UPDATE OF `rating`, `restricted`, `content_id` ON `user_ratings`
BEGIN
  DELETE FROM `content_rating_summary` WHERE `content_id` IN (OLD.`content_id`, NEW.`content_id`);
  INSERT INTO `content_rating_summary` (`content_id`, `rating_count`, `rating_total`, `average_rating`, `updated_at`)
  SELECT `content_id`, COUNT(*), COALESCE(SUM(`rating`), 0), AVG(`rating`), CAST((unixepoch() * 1000) AS integer)
  FROM `user_ratings`
  WHERE `content_id` IN (OLD.`content_id`, NEW.`content_id`) AND `restricted` = 0
  GROUP BY `content_id`;
END;
