-- Widen the rating constraint for the 1–10 slider, preserving historical 0s.
-- D1 keeps foreign keys enabled: save and restore cascading child rows too.
PRAGMA defer_foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE _rating_migration_votes AS SELECT * FROM user_ratings;
--> statement-breakpoint
CREATE TABLE _rating_migration_comments AS SELECT * FROM comments;
--> statement-breakpoint
CREATE TABLE _rating_migration_feed AS SELECT * FROM review_feed_summary;
--> statement-breakpoint
DROP TRIGGER user_ratings_after_insert_summary;
--> statement-breakpoint
DROP TRIGGER user_ratings_after_delete_summary;
--> statement-breakpoint
DROP TRIGGER user_ratings_after_update_summary;
--> statement-breakpoint
DROP TRIGGER review_feed_summary_after_user_rating_insert;
--> statement-breakpoint
DROP TRIGGER review_feed_summary_after_user_rating_delete;
--> statement-breakpoint
DROP TRIGGER review_feed_summary_after_user_rating_update_review;
--> statement-breakpoint
DROP TRIGGER review_feed_after_comment_delete;
--> statement-breakpoint
DROP TRIGGER review_feed_after_comment_update_restricted;
--> statement-breakpoint
DROP VIEW content_rating_calculation;
--> statement-breakpoint
DROP TABLE user_ratings;
--> statement-breakpoint
CREATE TABLE user_ratings (
  id text PRIMARY KEY NOT NULL,
  content_id text NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  rating integer NOT NULL,
  review text,
  edited integer NOT NULL DEFAULT 0 CHECK (edited IN (0, 1)),
  flagged integer NOT NULL DEFAULT 0 CHECK (flagged IN (0, 1)),
  restricted integer NOT NULL DEFAULT 0 CHECK (restricted IN (0, 1)),
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  CONSTRAINT user_ratings_rating_check CHECK (rating BETWEEN 0 AND 10 AND typeof(rating) = 'integer')
);
--> statement-breakpoint
INSERT INTO user_ratings SELECT * FROM _rating_migration_votes;
--> statement-breakpoint
-- OR IGNORE also supports SQLite test/import connections with FK checks off.
INSERT OR IGNORE INTO comments SELECT * FROM _rating_migration_comments ORDER BY depth, created_at, id;
--> statement-breakpoint
DELETE FROM review_feed_summary;
--> statement-breakpoint
INSERT INTO review_feed_summary SELECT * FROM _rating_migration_feed;
--> statement-breakpoint
DROP TABLE _rating_migration_votes;
--> statement-breakpoint
DROP TABLE _rating_migration_comments;
--> statement-breakpoint
DROP TABLE _rating_migration_feed;
--> statement-breakpoint
CREATE UNIQUE INDEX user_ratings_content_user_unique ON user_ratings (content_id, user_id);
--> statement-breakpoint
CREATE INDEX user_ratings_content_created_at_idx ON user_ratings (content_id, created_at);
--> statement-breakpoint
CREATE INDEX user_ratings_content_visible_created_at_idx ON user_ratings (content_id, restricted, created_at);
--> statement-breakpoint
CREATE INDEX user_ratings_user_visible_created_at_idx ON user_ratings (user_id, restricted, created_at DESC);
--> statement-breakpoint
CREATE INDEX user_ratings_visible_review_created_at_idx ON user_ratings (created_at DESC)
WHERE restricted = 0 AND review IS NOT NULL AND review <> '';
--> statement-breakpoint
CREATE VIEW content_rating_calculation AS
SELECT content_id, COUNT(*) AS rating_count, SUM(rating) AS rating_total, AVG(rating) AS average_rating
FROM user_ratings WHERE restricted = 0 OR user_id LIKE 'legacy-poll:%'
GROUP BY content_id;
--> statement-breakpoint
CREATE TRIGGER user_ratings_after_insert_summary AFTER INSERT ON user_ratings
BEGIN
  DELETE FROM content_rating_summary WHERE content_id = NEW.content_id;
  INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
  SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
  FROM content_rating_calculation WHERE content_id = NEW.content_id;
END;
--> statement-breakpoint
CREATE TRIGGER user_ratings_after_delete_summary AFTER DELETE ON user_ratings
BEGIN
  DELETE FROM content_rating_summary WHERE content_id = OLD.content_id;
  INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
  SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
  FROM content_rating_calculation WHERE content_id = OLD.content_id;
END;
--> statement-breakpoint
CREATE TRIGGER user_ratings_after_update_summary
AFTER UPDATE OF rating, restricted, content_id, user_id ON user_ratings
BEGIN
  DELETE FROM content_rating_summary WHERE content_id IN (OLD.content_id, NEW.content_id);
  INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
  SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
  FROM content_rating_calculation WHERE content_id IN (OLD.content_id, NEW.content_id);
END;
--> statement-breakpoint
CREATE TRIGGER review_feed_summary_after_user_rating_insert AFTER INSERT ON user_ratings
WHEN NEW.review IS NOT NULL AND NEW.review <> ''
BEGIN
  INSERT INTO review_feed_summary (review_id, comment_count, last_activity_at, visible)
  VALUES (NEW.id, 0, NEW.created_at, CASE WHEN NEW.restricted = 0 THEN 1 ELSE 0 END);
END;
--> statement-breakpoint
CREATE TRIGGER review_feed_summary_after_user_rating_delete AFTER DELETE ON user_ratings
BEGIN
  DELETE FROM review_feed_summary WHERE review_id = OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER review_feed_summary_after_user_rating_update_review
AFTER UPDATE OF review, restricted ON user_ratings
BEGIN
  DELETE FROM review_feed_summary WHERE review_id = NEW.id AND (NEW.review IS NULL OR NEW.review = '');
  INSERT INTO review_feed_summary (review_id, comment_count, last_activity_at, visible)
  SELECT NEW.id, COALESCE((SELECT COUNT(*) FROM comments WHERE review_id = NEW.id AND restricted = 0), 0),
    COALESCE((SELECT MAX(created_at) FROM comments WHERE review_id = NEW.id AND restricted = 0), NEW.created_at),
    CASE WHEN NEW.restricted = 0 AND NEW.review IS NOT NULL AND NEW.review <> '' THEN 1 ELSE 0 END
  WHERE NEW.review IS NOT NULL AND NEW.review <> ''
  ON CONFLICT(review_id) DO UPDATE SET comment_count = excluded.comment_count,
    last_activity_at = excluded.last_activity_at, visible = excluded.visible;
  UPDATE review_feed_summary SET visible = CASE WHEN NEW.restricted = 0 AND NEW.review IS NOT NULL AND NEW.review <> '' THEN 1 ELSE 0 END
  WHERE review_id = NEW.id AND (NEW.review IS NULL OR NEW.review = '');
END;
--> statement-breakpoint
CREATE TRIGGER review_feed_after_comment_delete AFTER DELETE ON comments WHEN OLD.restricted = 0
BEGIN
  UPDATE review_feed_summary SET comment_count = comment_count - 1,
    last_activity_at = COALESCE((SELECT MAX(created_at) FROM comments WHERE review_id = OLD.review_id AND restricted = 0),
      (SELECT created_at FROM user_ratings WHERE id = OLD.review_id))
  WHERE review_id = OLD.review_id;
END;
--> statement-breakpoint
CREATE TRIGGER review_feed_after_comment_update_restricted
AFTER UPDATE OF restricted ON comments WHEN NEW.restricted != OLD.restricted
BEGIN
  UPDATE review_feed_summary SET
    comment_count = CASE WHEN NEW.restricted = 1 THEN comment_count - 1 ELSE comment_count + 1 END,
    last_activity_at = CASE
      WHEN NEW.restricted = 0 AND NEW.created_at > last_activity_at THEN NEW.created_at
      WHEN NEW.restricted = 1 THEN COALESCE((SELECT MAX(created_at) FROM comments WHERE review_id = NEW.review_id AND restricted = 0),
        (SELECT created_at FROM user_ratings WHERE id = NEW.review_id))
      ELSE last_activity_at END
  WHERE review_id = NEW.review_id;
END;
--> statement-breakpoint
UPDATE cache_versions SET version = version + 1, updated_at = CAST(unixepoch() * 1000 AS integer);
