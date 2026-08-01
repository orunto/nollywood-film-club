# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences carried at equal weight:

- **Existing club members** — followers of Mr C's (Iroko Critic, @irokocritic) live Twitter/X Space, every Sunday 6PM WAT. They watch the Movie of the Week on their own streaming platform, then rate it, write reviews, and join or follow up on the live discussion.
- **General visitors** — people with no prior context on Mr C or the Space, browsing the Nollywood movie/TV catalog, reading ratings and reviews, or discovering the club for the first time. The product must stand on its own for this audience, not assume they arrived from the Space.

## Product Purpose

A community web app for discovering, watching, and discussing Nollywood movies and TV series. It exists to give Mr C's live Space a home outside of Twitter/X: a place to see the current Movie of the Week, rate and review titles, browse the full catalog, and read curated external reviews or club blog posts. Success is members participating in the weekly ritual (watch → rate → discuss) and casual visitors finding a credible, curated Nollywood catalog even if they never join the Space.

## Positioning

The live Sunday 6PM WAT X Space is the organizing mechanism, not one feature among several. The app is downstream of that ritual: one Movie of the Week at a time, synchronized communal watching, rating, and discussion, tied to a specific host personality (Mr C / Iroko Critic) and voice. A generic Letterboxd-for-Nollywood or IMDb-style catalog site could not truthfully copy this, because the weekly cadence and the personality-led community are the product, not a layer on top of a catalog.

## Operating Context

- Weekly cadence: a Movie of the Week is featured; members watch it on their own streaming platform before Sunday, then the live Space happens at 6PM WAT.
- Ratings/reviews are submitted through the app on a simple 0 (didn't like) / 5 (okay) / 10 (liked) scale, with an optional written review; one rating per user per title.
- Each title can carry multiple discussion threads (a rewatch, a sequel week), each linking to a live X Space and follow-up podcast episodes.
- Curated external reviews (publication, score, link) are attached to titles separately from member ratings.
- Member reviews support threaded (X-style) comment replies, with user-facing reporting (spoiler, harassment, spam, off-topic, other) and admin moderation (flag/restrict).
- Onboarding requires picking a unique username before a member can rate or comment.
- Roles: signed-in member (Stack Auth, cookie session) vs. role-gated admin, who manages the catalog, reviews, blog posts, and sets the Movie of the Week.
- Club-authored blog posts follow a draft/publish workflow, separate from curated external reviews.

## Capabilities and Constraints

- Catalog covers movies, TV shows, and short films, with genre, runtime, content rating, streaming platform/link, and a "where you can watch it right now" viewing category (in cinemas, streaming, coming to cinemas, coming to streaming, unavailable).
- Cast/crew credits are stored as name + role + character only, with **no photos**. This is explicitly an MVP constraint, not a permanent policy: the data-source integrations used to populate cast/crew rarely include photos, so they were dropped for ease of input. Future work may add photos back.
- Monetization: the product is free to use for current members, and stays that way for core participation. The user has plans to monetize around interactions/engagement rather than gating core use behind a paywall or membership tiers. No specific mechanism, pricing, or tier structure is decided yet — treat this as open.
- Auth flows through Stack Auth; admin access is gated by a `role: "admin"` flag in a user's client metadata, not a separate permission system.

## Brand Commitments

- Product name: **Nollywood Film Club**, abbreviated **NFC**.
- Hosted by **Mr C**, one half of **Iroko Critic** (@irokocritic); Mrs C co-hosts.
- All site copy follows Mr C's documented voice (warm community sincerity delivered through deadpan roasting) — see `data/voice/mr-c-voice-guide.md`, built from ~48 hours of podcast transcripts.
- Club vocabulary (e.g. "the good," "the bad," "the pushback," "Movie of the Week") is used as-is in the product rather than generic labels.

## Evidence on Hand

- Production database schema (`db/schema.ts`) already models real content: movies/TV shows, discussion threads, member ratings, external reviews, blog posts, comments, and reports.
- `data/voice/mr-c-voice-guide.md` is a real, sourced brand-voice reference (transcripts of the trailer + episodes #152–#181), not an invented persona.
- State the current absence plainly: no cast/crew photos exist in the data today (see Capabilities and Constraints) — this is a known gap, not evidence to fabricate around.

## Product Principles

1. The live Sunday Space is the ritual the product serves — features and flow should reinforce "watch → rate → discuss," not just support open-ended catalog browsing.
2. Serve cold visitors and existing members equally well; never assume a visitor already knows who Mr C is or what the Space is.
3. Voice consistency (Mr C's deadpan warmth) is a binding brand commitment across all copy, not a style preference.
4. Monetization, when it arrives, layers on top of interaction/engagement — core community participation (watching, rating, discussing) stays free and is not treated as a placeholder for a future paywall.
5. Missing cast/crew photos are a temporary MVP gap sourced from data availability, not a deliberate design choice — don't design around their permanent absence.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond standard web accessibility practice.
