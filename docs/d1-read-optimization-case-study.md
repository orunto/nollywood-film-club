# D1 Read Optimization: Engineering Case Study And Learning Roadmap

## The interview version

I optimized a Cloudflare D1 application whose public pages were becoming more
expensive as community activity grew. The important constraint was not simply
latency: D1 charges for rows read, so a query that returns 20 rows but scans a
large ratings or comments table is both a cost and scale problem.

I approached it as a read-model problem. Rather than asking the primary tables
to answer every public page directly, I added narrow, write-maintained summary
tables, bounded page queries, and cache keys that can be invalidated without a
database read on cache hits.

The design separates three concerns:

1. D1 remains the source of truth for content, ratings, comments, and reviews.
2. Small SQL summaries answer common aggregate and feed queries.
3. Cloudflare Cache stores anonymous responses while Workers KV stores only
   lightweight cache-version tokens.

That means the expensive work happens on writes or in one-time backfills, not
on every popular public read.

## Hard problem 1: Replace unbounded aggregates without lying to users

### The initial shape

The catalog and scoreboard calculated `AVG(rating)` and `COUNT(*)` from
`user_ratings` at request time. It was correct at low volume, but every cache
miss grouped a table that naturally grows faster than the content catalog.

### The solution

I introduced `content_rating_summary` keyed by `content_id`:

```text
content_id | rating_count | rating_total | average_rating | updated_at
```

The migration backfills visible ratings, and SQLite triggers are intended to
maintain the summary on rating creation, edit, deletion, content moves, and
moderation changes. Public catalog and scoreboard queries join the summary
instead of grouping `user_ratings`.

### Why this is difficult

The summary is a denormalized projection, so correctness is the hard part.
Every source-table transition has to preserve the invariant:

```text
rating_count = count(visible ratings for content)
rating_total = sum(visible ratings for content)
average_rating = rating_total / rating_count, or null when count is zero
```

I treated restricted ratings as invisible in the public projection. That made
the moderation path part of the data model rather than an afterthought.

### What I would say in an interview

"I chose a write-optimized materialized read model because the product read
pattern was predictable. The trade-off is more complex writes, so I made the
summary invariant explicit and planned consistency tests around every mutation
instead of trusting a happy-path aggregate test."

## Hard problem 2: Make URLs indexable without breaking existing links

### The initial shape

Content pages resolved a title slug by loading every title and release date,
then matching in application code. This makes an individual detail page cost
proportional to catalog size.

### The solution

I added a persisted `content.slug` plus indexes on the slug and content type.
New and updated records get the canonical application slug at write time. The
route keeps UUID resolution and a legacy fallback so old links can redirect to
the canonical URL while the catalog transitions.

### Why this is difficult

Slugs are data, not a presentation detail, once URLs depend on them. The
database backfill must reproduce the exact same Unicode normalization,
punctuation handling, year handling, and collision policy as the application.
The route must also use content type with the slug because uniqueness is scoped
to `(content_type, slug)`.

### Engineering lesson

Do not call a migration complete merely because it adds an index. Validate the
generated key algorithm against production-like titles, including accents,
punctuation, duplicate titles, and missing release dates.

## Hard problem 3: Bound community reads while preserving ordering

### The initial shape

Title pages loaded every rating for a film and review pages loaded every visible
comment. These queries are fine until one title or popular review accumulates
thousands of rows.

### The solution

I introduced repository methods with first-page limits and cursor support. The
server-rendered page reads a bounded first page; later pages use a stable cursor
based on `(created_at, id)`, so newly inserted rows do not cause prior rows to
be scanned again or skipped unpredictably.

The supporting indexes align with the predicates and ordering, for example:

```sql
WHERE content_id = ? AND restricted = 0
ORDER BY created_at, id
LIMIT ?
```

### What I would say in an interview

"Offset pagination is easy, but it degrades at depth and can shift under new
writes. I used a composite cursor for append-heavy public threads, while
keeping the existing depth validation independent of pagination."

## Hard problem 4: Build a review feed without grouping comments per request

### The initial shape

The review feed joined comments, grouped them for counts, and calculated a hot
score in the application after the query returned.

### The solution

I added `review_feed_summary`, keyed by review id, containing:

```text
review_id | comment_count | last_activity_at | visible
```

Comment and review changes maintain that projection. The feed can first select
recent visible candidates from an index on `(visible, last_activity_at DESC)`,
then join only the candidate rows to content and users.

### Design decision

The product needs a defined recent window. A 90-day window bounds the candidate
population and gives a clear product rule: inactive reviews leave the trending
feed rather than forcing the feed to rank all historical reviews forever.

### Final query shape

The final hot-score expression, ordering, limit, and offset now run in SQL over
the bounded candidate set. The Worker maps only the selected rows, rather than
loading candidates and sorting them in JavaScript.

## Hard problem 5: Invalidate a public cache without paying D1 on a hit

### The initial shape

Anonymous HTML and selected JSON responses were cached with the Workers Cache
API. A first implementation stored cache versions in D1. That was logically
correct but operationally wrong: the Worker had to read D1 to construct the
cache key before `cache.match`, so a cache hit still consumed a D1 read.

### The solution

I moved cache-version tokens to Cloudflare KV. The Worker now:

1. Reads a small KV token for each tag needed by a request.
2. Includes those tokens in the Cache API key.
3. Rotates relevant tokens after successful rating, comment, catalog, and
   discussion mutations.

Tokens are UUIDs, not numeric counters. That avoids an unsafe read-modify-write
increment in KV when concurrent writes occur.

### Consistency trade-off

Workers KV is eventually consistent. The cache invalidation window is therefore
bounded by KV propagation, commonly up to about 60 seconds, rather than being
instant. This is acceptable for public catalog and feed freshness, but would be
the wrong tool for a security boundary, financial balance, or inventory count.

### What I would say in an interview

"The key insight was that cache invalidation itself must not reintroduce the
database read I was trying to remove. I used Cache API for response bodies and
KV for globally readable, low-cardinality version tokens, then documented the
eventual-consistency window explicitly."

## How I verify this work

I do not trust code shape alone. The verification plan is:

1. Use `EXPLAIN QUERY PLAN` to confirm hot predicates use the intended indexes.
2. Compare summary rows to direct aggregates after every migration and in tests.
3. Test create, update, delete, restrict, and unrestrict transitions for each
   summary invariant.
4. Exercise cursor pages with records inserted between requests.
5. Confirm a warm anonymous cache request has no D1 query in Workers traces.
6. Compare D1 Query Insights before and after rollout: rows read, executions,
   average duration, and query efficiency.

## Rollout status

The D1 migrations are applied remotely, all 129 canonical slugs were backfilled
with the shared TypeScript algorithm, and `PRAGMA optimize` completed. Remote
integrity checks found zero missing slugs and zero invalid rating summaries.
`EXPLAIN QUERY PLAN` confirms the `(content_type, slug)` and feed-summary
indexes are used.

D1 Insights captured the pre-deployment baseline: the old catalog aggregate
averaged 9,008 rows read and 12.36 ms across 174 executions in the preceding
day. The new Worker bundle has been built and dry-run validated but intentionally
has not been deployed, so post-rollout Insights must be captured after an
approved deployment.

## Reading roadmap

### Stage 1: SQL and query-planner fundamentals

Goal: learn to predict the row count and index path of a query before running
it.

1. SQLite documentation: [EXPLAIN QUERY PLAN](https://www.sqlite.org/eqp.html)
2. SQLite documentation: [Query Planning](https://www.sqlite.org/queryplanner.html)
3. SQLite documentation: [Indexes on Expressions and Partial Indexes](https://www.sqlite.org/partialindex.html)
4. Use a local SQLite database to compare a table scan, a covering index, and a
   composite index for `WHERE ... ORDER BY ... LIMIT`.

Practice: write one slow query, inspect its plan, add one index, and explain why
the plan changed. Do not add indexes until the plan gives a reason.

### Stage 2: Data modeling and materialized read models

Goal: know when a normalized source table should produce a denormalized read
model.

1. Martin Kleppmann, *Designing Data-Intensive Applications*, chapters on data
   models, storage/retrieval, and derived data.
2. SQLite documentation: [CREATE TRIGGER](https://www.sqlite.org/lang_createtrigger.html)
3. PostgreSQL documentation: [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)

Practice: create an orders table and a per-customer spending summary. Prove with
tests that insert, update, delete, and status changes preserve it.

### Stage 3: Pagination and API contracts

Goal: design APIs that stay fast and stable as data grows.

1. Shopify: [Pagination with relative cursors](https://shopify.dev/api/usage/pagination-graphql)
2. Slack engineering: [Evolving API Pagination at Slack](https://slack.engineering/evolving-api-pagination-at-slack/)
3. Read the SQL `seek method` / keyset pagination chapter in Markus Winand's
   [Use The Index, Luke](https://use-the-index-luke.com/).

Practice: implement a `(created_at, id)` cursor, then insert a row between two
page requests and verify the client sees no duplicate or missing old rows.

### Stage 4: Caching and consistency

Goal: choose an invalidation strategy based on correctness requirements.

1. Cloudflare: [Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
2. Cloudflare: [Workers KV](https://developers.cloudflare.com/kv/)
3. Cloudflare: [KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/#consistency)
4. Meta engineering: [TAO: Facebook's Distributed Data Store for the Social
   Graph](https://www.usenix.org/conference/atc13/technical-sessions/presentation/bronson)

Practice: build versioned cache keys with UUID tokens. Simulate concurrent
writes and explain why a counter stored in an eventually consistent key-value
store is unsafe without coordination.

### Stage 5: Cloudflare D1 operations

Goal: connect query design to real production measurements.

1. Cloudflare: [D1 documentation](https://developers.cloudflare.com/d1/)
2. Cloudflare: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
3. Cloudflare: [D1 query insights](https://developers.cloudflare.com/d1/observability/query-insights/)
4. Cloudflare: [Workers observability](https://developers.cloudflare.com/workers/observability/)

Practice: record a baseline, ship one index or summary-table change, run
`PRAGMA optimize`, and compare rows read plus average duration rather than only
comparing endpoint latency.

### Stage 6: Communicating senior engineering judgment

Goal: explain trade-offs, not just implementation details.

For every project, prepare a five-minute narrative:

1. What grew, and why did the old complexity fail?
2. What invariant or latency/cost target mattered?
3. Which options did you reject, and why?
4. How did you test correctness and measure impact?
5. What trade-off remains, and what would trigger the next redesign?

The strongest interview answer is precise about both the improvement and its
limits. Saying "KV is eventually consistent, so I documented a freshness window
and did not use it for correctness-critical state" demonstrates more senior
judgment than claiming every cache is instant.
