-- Raw 0/5/10 votes, including restricted legacy polls, are never modified.
-- Certification is an editorial badge; it does not override the NFC score.
ALTER TABLE content ADD COLUMN nfc_certified integer NOT NULL DEFAULT 0 CHECK (nfc_certified IN (0, 1));
--> statement-breakpoint
CREATE VIEW content_rating_calculation AS
SELECT content_id, COUNT(*) AS rating_count, SUM(rating) AS rating_total,
  5.0 +
    CASE WHEN SUM(CASE rating WHEN 10 THEN 1.5 WHEN 0 THEN -1.0 ELSE 0.0 END) >= 0
      THEN 4.5 ELSE 2.0 END *
    SUM(CASE rating WHEN 10 THEN 1.5 WHEN 0 THEN -1.0 ELSE 0.0 END) /
    SUM(CASE rating WHEN 10 THEN 1.5 ELSE 1.0 END) AS average_rating
FROM user_ratings
WHERE restricted = 0
GROUP BY content_id;
--> statement-breakpoint
DROP TRIGGER user_ratings_after_insert_summary;
--> statement-breakpoint
DROP TRIGGER user_ratings_after_delete_summary;
--> statement-breakpoint
DROP TRIGGER user_ratings_after_update_summary;
--> statement-breakpoint
CREATE TRIGGER user_ratings_after_insert_summary
AFTER INSERT ON user_ratings
BEGIN
  DELETE FROM content_rating_summary WHERE content_id = NEW.content_id;
  INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
  SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
  FROM content_rating_calculation WHERE content_id = NEW.content_id;
END;
--> statement-breakpoint
CREATE TRIGGER user_ratings_after_delete_summary
AFTER DELETE ON user_ratings
BEGIN
  DELETE FROM content_rating_summary WHERE content_id = OLD.content_id;
  INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
  SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
  FROM content_rating_calculation WHERE content_id = OLD.content_id;
END;
--> statement-breakpoint
CREATE TRIGGER user_ratings_after_update_summary
AFTER UPDATE OF rating, restricted, content_id ON user_ratings
BEGIN
  DELETE FROM content_rating_summary WHERE content_id IN (OLD.content_id, NEW.content_id);
  INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
  SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
  FROM content_rating_calculation WHERE content_id IN (OLD.content_id, NEW.content_id);
END;
--> statement-breakpoint
DELETE FROM content_rating_summary;
--> statement-breakpoint
INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
FROM content_rating_calculation;
--> statement-breakpoint
-- Invalidate cached public scores when the migration is applied.
UPDATE cache_versions SET version = version + 1;
