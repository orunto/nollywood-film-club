-- Imported polls are valid votes even when restricted to hide their review text.
-- Use the same eligible population for the count, total, and average.
DROP VIEW content_rating_calculation;
--> statement-breakpoint
CREATE VIEW content_rating_calculation AS
SELECT content_id, COUNT(*) AS rating_count, SUM(rating) AS rating_total,
  AVG(rating) AS average_rating
FROM user_ratings
WHERE restricted = 0 OR user_id LIKE 'legacy-poll:%'
GROUP BY content_id;
--> statement-breakpoint
DELETE FROM content_rating_summary;
--> statement-breakpoint
INSERT INTO content_rating_summary (content_id, rating_count, rating_total, average_rating, updated_at)
SELECT content_id, rating_count, rating_total, average_rating, CAST(unixepoch() * 1000 AS integer)
FROM content_rating_calculation;
--> statement-breakpoint
UPDATE cache_versions SET version = version + 1, updated_at = CAST(unixepoch() * 1000 AS integer);
