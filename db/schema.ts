import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
  jsonb,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const contentTypeEnum = pgEnum("content_type", ["movie", "tv_show", "short_film"]);
export const ratingEnum = pgEnum("rating", [
  "G",
  "PG",
  "PG-13",
  "R",
  "NC-17",
  "TV-Y",
  "TV-Y7",
  "TV-G",
  "TV-PG",
  "TV-14",
  "TV-MA",
]);
export const streamingPlatformEnum = pgEnum("streaming_platform", [
  "netflix",
  "prime_video",
  "youtube",
  "disney_plus",
  "hulu",
  "hbo_max",
  "apple_tv",
  "paramount_plus",
  "peacock",
  "other",
]);

// Cast/crew credit stored on a content row — names only, no photos
export interface CastMember {
  role: "actor" | "director";
  name: string;
  characterName: string | null; // null for directors
}

// Movies/TV Shows table
export const content = pgTable("content", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  contentType: contentTypeEnum("content_type").notNull(),
  runtime: integer("runtime"), // in minutes
  releaseDate: timestamp("release_date"),
  rating: ratingEnum("rating"),
  synopsis: text("synopsis"),
  genre: text("genre").array(), // Array of genres
  posterImage: text("poster_image"), // Cloudinary public ID
  // Cloudinary version of the poster. Posters are re-uploaded under the same
  // public ID, so without this the delivery URL never changes and browsers
  // serve a stale image from cache.
  posterVersion: integer("poster_version"),
  trailerUrl: text("trailer_url"), // YouTube URL
  streamingUrl: text("streaming_url"), // Direct streaming URL
  streamingPlatform: streamingPlatformEnum("streaming_platform"), // Platform enum
  otherPlatform: text("other_platform"), // Name if platform is 'other'
  castMembers: jsonb("cast_members").$type<CastMember[]>(), // From JustWatch credits — see scripts/fetch-cast.ts
  isMovieOfTheWeek: boolean("is_movie_of_the_week").default(false),
  catalogNumber: integer("catalog_number"), // Order content was added, like discussions.episode_number
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Discussion spaces table — a discussion may be about a movie/TV show
// (contentId set) or a standalone topic (contentId null)
export const discussions = pgTable(
  "discussions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    contentId: uuid("content_id").references(() => content.id, {
      onDelete: "set null",
    }),
    spaceUrl: text("space_url"), // Twitter/X Space URL
    podcastLinks: text("podcast_links").array(), // Array of podcast URLs (Spotify, YouTube Music, etc.)
    episodeNumber: integer("episode_number"), // Podcast episode number (0 = intro); has gaps for private/skipped episodes
    discussionDate: timestamp("discussion_date"), // When the space was/will be held
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    // Prevents the episode-number typos that corrupted content.catalog_number
    // (which is derived from this column — see lib/catalog-sync.ts)
    uniqueIndex("discussions_episode_number_unique")
      .on(table.episodeNumber)
      .where(sql`${table.episodeNumber} IS NOT NULL`),
  ],
);

// User ratings/reviews table
export const userRatings = pgTable("user_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").references(() => content.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").notNull(), // Stack user ID
  rating: integer("rating"), // 0 (didn't like), 5 (okay), or 10 (liked)
  review: text("review"),
  flagged: boolean("flagged").default(false), // marked for admin attention, still publicly visible
  restricted: boolean("restricted").default(false), // hidden from public display
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews table (external blog reviews)
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").references(() => content.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(), // Review title (usually matches content title)
  description: text("description").notNull(), // Review snippet/description
  score: decimal("score", { precision: 3, scale: 1 }), // Review score (e.g., 8.5)
  reviewer: text("reviewer").notNull(), // Reviewer name/publication (e.g., "WKMUp")
  externalUrl: text("external_url"), // Link to full review article
  reviewImage: text("review_image"), // Cloudinary public ID for review image
  publishedAt: timestamp("published_at"), // When the review was published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pushback (replies) on a user review, threaded X-style.
//
// Every row carries `reviewId` — the root review — even when it is a reply to a
// reply. That denormalisation is deliberate: a whole thread is one flat query
// (WHERE review_id = ?) assembled into a tree in memory, and the trending feed
// counts interactions with a plain GROUP BY. Neither needs a recursive CTE.
export const pushbacks = pgTable(
  "pushbacks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => userRatings.id, { onDelete: "cascade" }),
    // null = a direct reply to the review itself
    parentId: uuid("parent_id").references((): AnyPgColumn => pushbacks.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").notNull(), // Stack user ID — no FK, there is no local users table
    body: text("body").notNull(),
    depth: integer("depth").notNull().default(0), // 0 = direct reply; capped at MAX_PUSHBACK_DEPTH
    flagged: boolean("flagged").default(false), // marked for admin attention, still publicly visible
    restricted: boolean("restricted").default(false), // hidden from public display
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("pushbacks_review_id_idx").on(table.reviewId),
    index("pushbacks_parent_id_idx").on(table.parentId),
  ],
);

// User-submitted reports of a review or a pushback. Polymorphic: `targetId`
// carries no FK, so the admin queue must tolerate a target that has since been
// deleted. Reporting a target also flips its `flagged` column, which is what
// puts it in front of the moderation UI admins already use.
export const reportTargetEnum = pgEnum("report_target", ["review", "pushback"]);
export const reportReasonEnum = pgEnum("report_reason", [
  "spoiler",
  "harassment",
  "spam",
  "off_topic",
  "other",
]);
export const reportStatusEnum = pgEnum("report_status", ["open", "actioned", "dismissed"]);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: reportTargetEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reporterId: text("reporter_id").notNull(), // Stack user ID
    reason: reportReasonEnum("reason").notNull(),
    note: text("note"), // optional free text from the reporter
    status: reportStatusEnum("status").notNull().default("open"),
    resolvedBy: text("resolved_by"), // Stack user ID of the admin who closed it
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    // One report per user per target — makes POST /api/user/reports idempotent
    uniqueIndex("reports_reporter_target_unique").on(
      table.reporterId,
      table.targetType,
      table.targetId,
    ),
    index("reports_status_idx").on(table.status),
  ],
);

// Blog posts table
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"), // Brief description/summary
  slug: text("slug").notNull().unique(), // URL-friendly version of title
  published: boolean("published").default(false),
  publishedAt: timestamp("published_at"), // When the post was published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const contentRelations = relations(content, ({ many }) => ({
  ratings: many(userRatings),
  reviews: many(reviews),
  discussions: many(discussions),
}));

export const discussionRelations = relations(discussions, ({ one }) => ({
  content: one(content, {
    fields: [discussions.contentId],
    references: [content.id],
  }),
}));

export const userRatingRelations = relations(userRatings, ({ one, many }) => ({
  content: one(content, {
    fields: [userRatings.contentId],
    references: [content.id],
  }),
  pushbacks: many(pushbacks),
}));

export const pushbackRelations = relations(pushbacks, ({ one, many }) => ({
  review: one(userRatings, {
    fields: [pushbacks.reviewId],
    references: [userRatings.id],
  }),
  parent: one(pushbacks, {
    fields: [pushbacks.parentId],
    references: [pushbacks.id],
    relationName: "pushback_parent",
  }),
  replies: many(pushbacks, { relationName: "pushback_parent" }),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  content: one(content, {
    fields: [reviews.contentId],
    references: [content.id],
  }),
}));
