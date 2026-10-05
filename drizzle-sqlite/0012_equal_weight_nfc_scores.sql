-- Restore equal-weight arithmetic averages without changing any rating rows.
-- Legacy poll counts and editorial certification remain independent of scores.
DROP VIEW content_rating_calculation;
--> statement-breakpoint
CREATE VIEW content_rating_calculation AS
WITH counted AS (
  SELECT content_id, COUNT(*) AS rating_count
  FROM user_ratings
  WHERE restricted = 0 OR user_id LIKE 'legacy-poll:%'
  GROUP BY content_id
), scored AS (
  SELECT content_id, SUM(rating) AS rating_total, AVG(rating) AS average_rating
  FROM user_ratings
  WHERE restricted = 0
  GROUP BY content_id
)
SELECT counted.content_id, counted.rating_count,
  COALESCE(scored.rating_total, 0) AS rating_total, scored.average_rating
FROM counted LEFT JOIN scored ON counted.content_id = scored.content_id;
--> statement-breakpoint
DELETE FROM content_rating_summary;
--> statement-breakpoint
INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
FROM content_rating_calculation;
--> statement-breakpoint
UPDATE cache_versions SET version = version + 1, updated_at = CAST(unixepoch() * 1000 AS integer);
