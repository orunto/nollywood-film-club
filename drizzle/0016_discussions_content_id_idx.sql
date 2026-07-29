-- A film can be discussed more than once (a rewatch, a sequel week). The data
-- model already allowed it — content_id has never been unique — but nothing
-- queried by it expecting more than one row, so it was never indexed.
CREATE INDEX IF NOT EXISTS "discussions_content_id_idx" ON "discussions" USING btree ("content_id");
