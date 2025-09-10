import { pgTable, text, integer, timestamp, boolean, decimal, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const contentTypeEnum = pgEnum('content_type', ['movie', 'tv_show']);
export const ratingEnum = pgEnum('rating', ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA']);
export const streamingPlatformEnum = pgEnum('streaming_platform', ['netflix', 'prime_video', 'disney_plus', 'hulu', 'hbo_max', 'apple_tv', 'paramount_plus', 'peacock', 'other']);

// Movies/TV Shows table
export const content = pgTable('content', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  contentType: contentTypeEnum('content_type').notNull(),
  runtime: integer('runtime'), // in minutes
  releaseDate: timestamp('release_date'),
  rating: ratingEnum('rating'),
  synopsis: text('synopsis'),
  genre: text('genre').array(), // Array of genres
  posterImage: text('poster_image'), // Cloudinary public ID
  trailerUrl: text('trailer_url'), // YouTube URL
  streamingUrl: text('streaming_url'), // Direct streaming URL
  streamingPlatform: streamingPlatformEnum('streaming_platform'), // Platform enum
  otherPlatform: text('other_platform'), // Name if platform is 'other'
  spaceUrl: text('space_url'), // Twitter/X Space URL
  podcastLinks: text('podcast_links').array(), // Array of podcast URLs
  isMovieOfTheWeek: boolean('is_movie_of_the_week').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});



// Usernames table - simple table to track unique usernames
export const usernames = pgTable('usernames', {
  id: uuid('id').primaryKey().defaultRandom(),
  stackUserId: text('stack_user_id').notNull().unique(), // Stack user ID
  username: text('username').notNull().unique(), // Unique username
  createdAt: timestamp('created_at').defaultNow(),
});

// User ratings/reviews table
export const userRatings = pgTable('user_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').references(() => content.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // Stack user ID
  rating: decimal('rating', { precision: 2, scale: 1 }), // 1.0 to 5.0
  review: text('review'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Reviews table (external blog reviews)
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').references(() => content.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // Review title (usually matches content title)
  description: text('description').notNull(), // Review snippet/description
  score: decimal('score', { precision: 2, scale: 1 }), // Review score (e.g., 8.5)
  reviewer: text('reviewer').notNull(), // Reviewer name/publication (e.g., "WKMUp")
  externalUrl: text('external_url'), // Link to full review article
  reviewImage: text('review_image'), // Cloudinary public ID for review image
  publishedAt: timestamp('published_at'), // When the review was published
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


// Relations
export const contentRelations = relations(content, ({ many }) => ({
  ratings: many(userRatings),
  reviews: many(reviews),
}));

export const usernameRelations = relations(usernames, ({ many }) => ({
  ratings: many(userRatings),
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

