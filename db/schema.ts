import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  decimal,
  uuid,
  pgEnum,
  uniqueIndex,
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
  "disney_plus",
  "hulu",
  "hbo_max",
  "apple_tv",
  "paramount_plus",
  "peacock",
  "other",
]);

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
  trailerUrl: text("trailer_url"), // YouTube URL
  streamingUrl: text("streaming_url"), // Direct streaming URL
  streamingPlatform: streamingPlatformEnum("streaming_platform"), // Platform enum
  otherPlatform: text("other_platform"), // Name if platform is 'other'
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

export const userRatingRelations = relations(userRatings, ({ one }) => ({
  content: one(content, {
    fields: [userRatings.contentId],
    references: [content.id],
  }),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  content: one(content, {
    fields: [reviews.contentId],
    references: [content.id],
  }),
}));
