import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const CONTENT_TYPES = ["movie", "tv_show", "short_film"] as const;
export const RATINGS = [
  "G",
  "PG",
  "PG-13",
  "13",
  "R",
  "16",
  "NC-17",
  "18+",
  "TV-Y",
  "TV-Y7",
  "TV-G",
  "TV-PG",
  "TV-14",
  "TV-MA",
] as const;
export const STREAMING_PLATFORMS = [
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
] as const;
export const VIEWING_CATEGORIES = [
  "in_cinemas",
  "streaming",
  "coming_to_cinemas",
  "coming_to_streaming",
  "unavailable",
] as const;
export const REPORT_TARGETS = ["review", "comment"] as const;
export const REPORT_REASONS = [
  "spoiler",
  "harassment",
  "spam",
  "off_topic",
  "other",
] as const;
export const MODERATION_STATUSES = [
  "open",
  "actioned",
  "dismissed",
] as const;
export const CONTACT_CATEGORIES = ["bug", "improvement", "other"] as const;
export const USER_ROLES = ["user", "admin"] as const;
export const MEDIA_STATUSES = ["staged", "ready", "missing"] as const;

export interface CastMember {
  role: "actor" | "director";
  name: string;
  characterName: string | null;
}

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () =>
  timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

// Better Auth uses these four models. Existing Hexclave IDs are imported into
// users.id so community records do not need identity rewrites.
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    username: text("username"),
    role: text("role", { enum: USER_ROLES }).notNull().default("user"),
    regular: integer("regular", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
    uniqueIndex("users_username_lower_unique").on(
      sql`lower(${table.username})`,
    ),
    check("users_role_check", sql`${table.role} IN ('user', 'admin')`),
    check(
      "users_email_verified_check",
      sql`${table.emailVerified} IN (0, 1)`,
    ),
    check("users_regular_check", sql`${table.regular} IN (0, 1)`),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("sessions_token_unique").on(table.token),
    index("sessions_user_id_idx").on(table.userId),
  ],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: id(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
  ],
);

export const media = sqliteTable(
  "media",
  {
    id: id(),
    objectKey: text("object_key").notNull(),
    publicId: text("public_id").notNull(),
    version: integer("version").notNull(),
    mimeType: text("mime_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    byteSize: integer("byte_size"),
    checksum: text("checksum"),
    status: text("status", { enum: MEDIA_STATUSES })
      .notNull()
      .default("staged"),
    originalProvider: text("original_provider"),
    originalMetadata: text("original_metadata", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("media_object_key_unique").on(table.objectKey),
    uniqueIndex("media_public_id_version_unique").on(
      table.publicId,
      table.version,
    ),
    check("media_version_check", sql`${table.version} >= 1`),
    check(
      "media_dimensions_check",
      sql`(${table.width} IS NULL OR ${table.width} > 0) AND (${table.height} IS NULL OR ${table.height} > 0)`,
    ),
    check(
      "media_byte_size_check",
      sql`${table.byteSize} IS NULL OR ${table.byteSize} >= 0`,
    ),
    check(
      "media_status_check",
      sql`${table.status} IN ('staged', 'ready', 'missing')`,
    ),
    check(
      "media_original_metadata_json_check",
      sql`${table.originalMetadata} IS NULL OR json_valid(${table.originalMetadata})`,
    ),
  ],
);

export const content = sqliteTable(
  "content",
  {
    id: id(),
    title: text("title").notNull(),
    contentType: text("content_type", { enum: CONTENT_TYPES }).notNull(),
    runtime: integer("runtime"),
    releaseDate: timestamp("release_date"),
    rating: text("rating", { enum: RATINGS }),
    synopsis: text("synopsis"),
    genre: text("genre", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    posterMediaId: text("poster_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    legacyPosterImage: text("poster_image"),
    legacyPosterVersion: integer("poster_version"),
    trailerUrl: text("trailer_url"),
    streamingUrl: text("streaming_url"),
    streamingPlatform: text("streaming_platform", {
      enum: STREAMING_PLATFORMS,
    }),
    otherPlatform: text("other_platform"),
    viewingCategory: text("viewing_category", { enum: VIEWING_CATEGORIES }),
    castMembers: text("cast_members", { mode: "json" }).$type<CastMember[]>(),
    isMovieOfTheWeek: integer("is_movie_of_the_week", { mode: "boolean" })
      .notNull()
      .default(false),
    catalogNumber: integer("catalog_number"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("motw_singleton")
      .on(table.isMovieOfTheWeek)
      .where(sql`${table.isMovieOfTheWeek} = 1`),
    index("content_poster_media_id_idx").on(table.posterMediaId),
    check(
      "content_type_check",
      sql`${table.contentType} IN ('movie', 'tv_show', 'short_film')`,
    ),
    check(
      "content_rating_check",
      sql`${table.rating} IS NULL OR ${table.rating} IN ('G', 'PG', 'PG-13', '13', 'R', '16', 'NC-17', '18+', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA')`,
    ),
    check(
      "content_streaming_platform_check",
      sql`${table.streamingPlatform} IS NULL OR ${table.streamingPlatform} IN ('netflix', 'prime_video', 'youtube', 'disney_plus', 'hulu', 'hbo_max', 'apple_tv', 'paramount_plus', 'peacock', 'other')`,
    ),
    check(
      "content_viewing_category_check",
      sql`${table.viewingCategory} IS NULL OR ${table.viewingCategory} IN ('in_cinemas', 'streaming', 'coming_to_cinemas', 'coming_to_streaming', 'unavailable')`,
    ),
    check(
      "content_genre_json_check",
      sql`json_valid(${table.genre}) AND json_type(${table.genre}) = 'array'`,
    ),
    check(
      "content_cast_members_json_check",
      sql`${table.castMembers} IS NULL OR (json_valid(${table.castMembers}) AND json_type(${table.castMembers}) = 'array')`,
    ),
    check(
      "content_motw_check",
      sql`${table.isMovieOfTheWeek} IN (0, 1)`,
    ),
  ],
);

export const discussions = sqliteTable(
  "discussions",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description"),
    contentId: text("content_id").references(() => content.id, {
      onDelete: "set null",
    }),
    spaceUrl: text("space_url"),
    podcastLinks: text("podcast_links", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    episodeNumber: integer("episode_number"),
    discussionDate: timestamp("discussion_date"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("discussions_episode_number_unique")
      .on(table.episodeNumber)
      .where(sql`${table.episodeNumber} IS NOT NULL`),
    index("discussions_content_id_idx").on(table.contentId),
    check(
      "discussions_podcast_links_json_check",
      sql`json_valid(${table.podcastLinks}) AND json_type(${table.podcastLinks}) = 'array'`,
    ),
  ],
);

export const userRatings = sqliteTable(
  "user_ratings",
  {
    id: id(),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    rating: integer("rating").notNull(),
    review: text("review"),
    edited: integer("edited", { mode: "boolean" }).notNull().default(false),
    flagged: integer("flagged", { mode: "boolean" })
      .notNull()
      .default(false),
    restricted: integer("restricted", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("user_ratings_content_user_unique").on(
      table.contentId,
      table.userId,
    ),
    check("user_ratings_rating_check", sql`${table.rating} IN (0, 5, 10)`),
    check("user_ratings_edited_check", sql`${table.edited} IN (0, 1)`),
    check("user_ratings_flagged_check", sql`${table.flagged} IN (0, 1)`),
    check(
      "user_ratings_restricted_check",
      sql`${table.restricted} IN (0, 1)`,
    ),
  ],
);

export const reviews = sqliteTable(
  "reviews",
  {
    id: id(),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    scoreTenths: integer("score_tenths"),
    reviewer: text("reviewer").notNull(),
    externalUrl: text("external_url"),
    reviewMediaId: text("review_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    legacyReviewImage: text("review_image"),
    publishedAt: timestamp("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("reviews_content_id_idx").on(table.contentId),
    index("reviews_review_media_id_idx").on(table.reviewMediaId),
    check(
      "reviews_score_tenths_check",
      sql`${table.scoreTenths} IS NULL OR ${table.scoreTenths} BETWEEN 0 AND 100`,
    ),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: id(),
    reviewId: text("review_id")
      .notNull()
      .references(() => userRatings.id, { onDelete: "cascade" }),
    parentId: text("parent_id").references(
      (): AnySQLiteColumn => comments.id,
      { onDelete: "cascade" },
    ),
    userId: text("user_id").notNull(),
    body: text("body").notNull(),
    depth: integer("depth").notNull().default(0),
    flagged: integer("flagged", { mode: "boolean" })
      .notNull()
      .default(false),
    restricted: integer("restricted", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("comments_review_id_idx").on(table.reviewId),
    index("comments_parent_id_idx").on(table.parentId),
    check("comments_depth_check", sql`${table.depth} BETWEEN 0 AND 5`),
    check("comments_flagged_check", sql`${table.flagged} IN (0, 1)`),
    check(
      "comments_restricted_check",
      sql`${table.restricted} IN (0, 1)`,
    ),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    id: id(),
    targetType: text("target_type", { enum: REPORT_TARGETS }).notNull(),
    targetId: text("target_id").notNull(),
    reporterId: text("reporter_id").notNull(),
    reason: text("reason", { enum: REPORT_REASONS }).notNull(),
    note: text("note"),
    status: text("status", { enum: MODERATION_STATUSES })
      .notNull()
      .default("open"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("reports_reporter_target_unique").on(
      table.reporterId,
      table.targetType,
      table.targetId,
    ),
    index("reports_status_idx").on(table.status),
    check(
      "reports_target_type_check",
      sql`${table.targetType} IN ('review', 'comment')`,
    ),
    check(
      "reports_reason_check",
      sql`${table.reason} IN ('spoiler', 'harassment', 'spam', 'off_topic', 'other')`,
    ),
    check(
      "reports_status_check",
      sql`${table.status} IN ('open', 'actioned', 'dismissed')`,
    ),
  ],
);

export const contactMessages = sqliteTable(
  "contact_messages",
  {
    id: id(),
    category: text("category", { enum: CONTACT_CATEGORIES }).notNull(),
    message: text("message").notNull(),
    email: text("email"),
    userId: text("user_id"),
    status: text("status", { enum: MODERATION_STATUSES })
      .notNull()
      .default("open"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: createdAt(),
  },
  (table) => [
    index("contact_messages_status_idx").on(table.status),
    check(
      "contact_messages_category_check",
      sql`${table.category} IN ('bug', 'improvement', 'other')`,
    ),
    check(
      "contact_messages_status_check",
      sql`${table.status} IN ('open', 'actioned', 'dismissed')`,
    ),
  ],
);

export const blogPosts = sqliteTable(
  "blog_posts",
  {
    id: id(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    excerpt: text("excerpt"),
    slug: text("slug").notNull(),
    published: integer("published", { mode: "boolean" })
      .notNull()
      .default(false),
    publishedAt: timestamp("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_unique").on(table.slug),
    check("blog_posts_published_check", sql`${table.published} IN (0, 1)`),
  ],
);

export const contentRelations = relations(content, ({ one, many }) => ({
  poster: one(media, {
    fields: [content.posterMediaId],
    references: [media.id],
  }),
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
  comments: many(comments),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  review: one(userRatings, {
    fields: [comments.reviewId],
    references: [userRatings.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_parent",
  }),
  replies: many(comments, { relationName: "comment_parent" }),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  content: one(content, {
    fields: [reviews.contentId],
    references: [content.id],
  }),
  image: one(media, {
    fields: [reviews.reviewMediaId],
    references: [media.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
