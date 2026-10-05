# NFC ratings

Members now choose an integer from 1–10 using a red–yellow–green slider.
Historical `0`, `5`, and `10` votes remain unchanged. Every eligible vote
has equal weight in the numerical score. Verdict bands are 0–4 (disliked),
5–6 (okay), and 7–10 (liked). The initial unselected state is a grey blank
face with “I don't know”; it is not a saved rating.

## Calculation

Let `B`, `O`, and `G` count eligible bad, okay, and good votes. Eligible votes
include all legacy polls and non-restricted member ratings:

```text
count = B + O + G
if count = 0: score = null
otherwise: score = sum of eligible numerical ratings / count
```

This is the ordinary arithmetic mean of the stored numerical choices,
with a range of 0–10. There is no weighting or prior. Public scores require
at least 25 eligible ratings; the underlying average remains stored at full precision.

| Bad | Okay | Good | Underlying average (before display threshold) |
| ---: | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 |
| 0 | 1 | 0 | 5 |
| 0 | 0 | 1 | 10 |
| 3 | 0 | 2 | 4 |
| 1 | 0 | 1 | 5 |
| 0 | 0 | 0 | N/A |

Store full precision for ranking. The scoreboard and its mobile detail sheet
display the average as a percentage (multiplied by 10 and rounded to an integer).
The scoreboard includes only titles with at least 25 eligible ratings, without a
default result cap. Across the app, titles below 25 ratings keep their NFC score
section and show N/A.

Detail-page distribution bars and verdict counts use a separate whole-content
aggregate over the same eligible votes as the NFC score. They include restricted
legacy polls and all visible member ratings, regardless of the 50-row review page.
Legacy-only titles also show distributions once they reach 25 votes. Restricted
member votes stay excluded, and legacy review cards remain hidden.

## Editorial certification

An authorised administrator can grant or revoke **NFC certified** in the
catalog editor. This adds a badge to the scoreboard, its mobile detail sheet,
the film detail page, and the film hero. Certification does not change the
numeric score, require a score threshold, or disappear when votes change.
There is one public numeric score; certification does not override it.
Omitting the certification field from an existing admin update preserves it.

## Legacy data and migration

`0010_weighted_nfc_scores.sql` adds the certification flag, replaces score
summary triggers, and rebuilds derived summaries. It does not update,
delete, remap, or unrestrict any `user_ratings` rows. Restricted legacy poll
records remain excluded from public calculations under the existing rule.
This historical exclusion is corrected by migration 0013 below.
Insert, delete, vote edits, restriction changes, and content moves refresh
the affected summaries. Certification is independent of that calculation.

`0011_include_legacy_poll_counts.sql` corrects the public count to include
all `legacy-poll:` rows plus non-restricted member rows. Restricted member
rows remain excluded. At this migration stage the score uses only non-restricted
ratings, so legacy-only titles have a count but a null score. Identity changes
also refresh the summary because the legacy prefix determines inclusion.

Film detail counts use the complete summary count instead of the length of
the paginated visible review list. Legacy poll rows remain hidden from the
written review feed, and all original rating records stay unchanged.

`0012_equal_weight_nfc_scores.sql` replaces the historical weighted calculation
with `AVG(rating)`, rebuilds derived scores, and invalidates cached public reads.
The existing triggers continue refreshing summaries on writes through the view.
It preserves every raw rating, restriction, legacy count, and certification flag.

`0013_include_legacy_poll_scores.sql` includes all `legacy-poll:` rows in both
the score and vote count, regardless of their restriction flag. Imported polls
were marked restricted to hide anonymous review cards, not to discard their
votes (see commit `3ab6ab9`). Moderator-restricted member ratings stay excluded.
The migration rebuilds summaries and invalidates cached public reads without
changing the original rating records or exposing legacy review text.

`0014_integer_member_ratings.sql` widens the storage constraint to all integers
from 0–10 (zero is retained for historical votes). The member slider offers 1–10.
It preserves ratings, nested comments, and review feed summaries when rebuilding
the table with foreign keys enabled, then restores indexes and summary triggers.

The scoreboard shows the vote count in its sortable Voted column and mobile
detail sheet, including legacy poll counts under the rule above.

## Pre-change production backup

The 2026-10-04 production D1 snapshot was exported before implementation:

- SQL: `data/nfc-pre-weighting-2026-10-04.sql`
- CSV: `data/nfc-pre-weighting-2026-10-04/<table>.csv` (19 tables)
- XLSX: `data/nfc-pre-weighting-2026-10-04/database.xlsx`
- Counts and SQL SHA-256: `data/nfc-pre-weighting-2026-10-04/manifest.json`

`data/` is Git-ignored. Backups stay on the local filesystem and include the
full database. SQL is the authoritative restorable backup; spreadsheets
are inspection copies. XLSX uses literal text cells to preserve IDs and
prevent strings being interpreted as formulas.

Reproduce conversion with the standard-library-only script:

```powershell
python tools/migration/export-d1-snapshot.py path/to/new-snapshot.sql
```

Validate the migration against a downloaded snapshot in memory, without
writing to the production database or the original snapshot:

```powershell
bunx tsx tools/repositories/validate-weighted-snapshot.ts data/nfc-pre-weighting-2026-10-04.sql
```

The validation checks all rating rows are byte-for-byte-equivalent at the
field level, SQLite integrity and foreign keys, and scores for all titles.
Deployment must apply the new migration before code querying the new
certification column starts serving requests.
