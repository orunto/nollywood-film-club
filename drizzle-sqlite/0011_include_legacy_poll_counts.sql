-- Count imported legacy polls without changing their records or allowing
-- moderator-restricted member ratings into the public count or score.
-- The score continues to use only non-restricted ratings.
DROP VIEW content_rating_calculation;
--> statement-breakpoint
CREATE VIEW content_rating_calculation AS
WITH counted AS (
  SELECT content_id, COUNT(*) AS rating_count
  FROM user_ratings
  WHERE restricted = 0 OR user_id LIKE 'legacy-poll:%'
  GROUP BY content_id
), scored AS (
  SELECT content_id, SUM(rating) AS rating_total,
    5.0 +
      CASE WHEN SUM(CASE rating WHEN 10 THEN 1.5 WHEN 0 THEN -1.0 ELSE 0.0 END) >= 0
        THEN 4.5 ELSE 2.0 END *
      SUM(CASE rating WHEN 10 THEN 1.5 WHEN 0 THEN -1.0 ELSE 0.0 END) /
      SUM(CASE rating WHEN 10 THEN 1.5 ELSE 1.0 END) AS average_rating
  FROM user_ratings
  WHERE restricted = 0
  GROUP BY content_id
)
SELECT counted.content_id, counted.rating_count,
  COALESCE(scored.rating_total, 0) AS rating_total, scored.average_rating
FROM counted LEFT JOIN scored ON counted.content_id = scored.content_id;
--> statement-breakpoint
-- Changing the identity can change whether a restricted vote is legacy.
DROP TRIGGER user_ratings_after_update_summary;
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
DELETE FROM content_rating_summary;
--> statement-breakpoint
INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
FROM content_rating_calculation;
--> statement-breakpoint
UPDATE cache_versions SET version = version + 1, updated_at = CAST(unixepoch() * 1000 AS integer);
