import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  isNull,
  isNotNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import {
  CONTENT_TYPES,
  comments,
  content,
  discussions,
  reviews,
  userRatings,
  users,
  type CastMember,
} from "../db/schema";
import * as schema from "../db/schema";

export type ContentType = (typeof CONTENT_TYPES)[number];

export interface Content {
  id: string;
  title: string;
  contentType: ContentType;
  runtime: number | null;
  releaseDate: string | null;
  rating: string | null;
  synopsis: string | null;
  genre: string[] | null;
  posterImage: string | null;
  posterVersion: number | null;
  trailerUrl: string | null;
  streamingUrl: string | null;
  streamingPlatform: string | null;
  otherPlatform: string | null;
  viewingCategory: string | null;
  castMembers: CastMember[] | null;
  isMovieOfTheWeek: boolean;
  catalogNumber: number | null;
  createdAt: string;
  updatedAt: string;
  userRating: number | null;
}

export interface ScoreboardEntry extends Content {
  ratingsCount: number;
}

export interface UserRating {
  id: string;
  contentId: string;
  userId: string;
  rating: number | null;
  review: string | null;
  edited: boolean;
  flagged: boolean;
  restricted: boolean;
  createdAt: string;
  updatedAt: string;
  username?: string;
  profileImage?: string;
  isRegular?: boolean;
  profileUsername?: string | null;
}

export interface FeedReview extends UserRating {
  commentCount: number;
  film: {
    title: string;
    contentType: ContentType;
    releaseDate: string | null;
    posterImage: string | null;
  } | null;
}

export interface CriticReview {
  id: string;
  contentId: string;
  title: string;
  description: string;
  score: number | null;
  reviewer: string;
  externalUrl: string | null;
  reviewImage: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentSlugEntry {
  id: string;
  title: string;
  releaseDate: string | null;
}

export interface CommentRecord {
  id: string;
  reviewId: string;
  parentId: string | null;
  userId: string;
  body: string;
  depth: number;
  createdAt: string;
  username: string;
  profileImage?: string;
}

export interface Discussion {
  id: string;
  title: string;
  description: string | null;
  contentId: string | null;
  spaceUrl: string | null;
  podcastLinks: string[] | null;
  episodeNumber: number | null;
  discussionDate: string | null;
  createdAt: string;
  updatedAt: string;
  content: {
    id: string;
    title: string;
    contentType: ContentType;
    releaseDate: string | null;
    synopsis: string | null;
    runtime: number | null;
  } | null;
}

export interface DiscussionPageOptions {
  limit?: number;
  offset?: number;
  now?: Date;
}

type AsyncSQLiteDatabase = BaseSQLiteDatabase<
  "async",
  unknown,
  typeof schema
>;

const contentSelection = {
  id: content.id,
  title: content.title,
  contentType: content.contentType,
  runtime: content.runtime,
  releaseDate: content.releaseDate,
  rating: content.rating,
  synopsis: content.synopsis,
  genre: content.genre,
  posterImage: content.legacyPosterImage,
  posterVersion: content.legacyPosterVersion,
  trailerUrl: content.trailerUrl,
  streamingUrl: content.streamingUrl,
  streamingPlatform: content.streamingPlatform,
  otherPlatform: content.otherPlatform,
  viewingCategory: content.viewingCategory,
  castMembers: content.castMembers,
  isMovieOfTheWeek: content.isMovieOfTheWeek,
  catalogNumber: content.catalogNumber,
  createdAt: content.createdAt,
  updatedAt: content.updatedAt,
};

function toIsoString(value: Date | null) {
  return value?.toISOString() ?? null;
}

type ContentRow = Omit<
  typeof content.$inferSelect,
  "legacyPosterImage" | "legacyPosterVersion" | "posterMediaId"
> & {
    legacyPosterImage?: string | null;
    legacyPosterVersion?: number | null;
    posterImage?: string | null;
    posterVersion?: number | null;
    userRating?: string | number | null;
  };

function mapContent(item: ContentRow): Content {
  return {
    id: item.id,
    title: item.title,
    contentType: item.contentType,
    runtime: item.runtime,
    releaseDate: toIsoString(item.releaseDate),
    rating: item.rating,
    synopsis: item.synopsis,
    genre: item.genre,
    posterImage: item.posterImage ?? item.legacyPosterImage ?? null,
    posterVersion: item.posterVersion ?? item.legacyPosterVersion ?? null,
    trailerUrl: item.trailerUrl,
    streamingUrl: item.streamingUrl,
    streamingPlatform: item.streamingPlatform,
    otherPlatform: item.otherPlatform,
    viewingCategory: item.viewingCategory,
    castMembers: item.castMembers,
    isMovieOfTheWeek: item.isMovieOfTheWeek,
    catalogNumber: item.catalogNumber,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    userRating:
      item.userRating === null || item.userRating === undefined
        ? null
        : Number(item.userRating),
  };
}

function mapDiscussion(
  item: typeof discussions.$inferSelect,
  related: typeof content.$inferSelect | null,
): Discussion {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    contentId: item.contentId,
    spaceUrl: item.spaceUrl,
    podcastLinks: item.podcastLinks,
    episodeNumber: item.episodeNumber,
    discussionDate: toIsoString(item.discussionDate),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    content: related
      ? {
          id: related.id,
          title: related.title,
          contentType: related.contentType,
          releaseDate: toIsoString(related.releaseDate),
          synopsis: related.synopsis,
          runtime: related.runtime,
        }
      : null,
  };
}

function visibleDiscussions(now: Date): SQL {
  return or(
    isNull(discussions.discussionDate),
    lte(discussions.discussionDate, now),
  )!;
}

const newestDiscussionOrder = [
  sql`${discussions.episodeNumber} IS NULL`,
  desc(discussions.episodeNumber),
  sql`${discussions.discussionDate} IS NULL`,
  desc(discussions.discussionDate),
  desc(discussions.createdAt),
] as const;

const visibleFeedReviews = and(
  eq(userRatings.restricted, false),
  isNotNull(userRatings.review),
  ne(userRatings.review, ""),
);

function getDisplayUser(
  userId: string,
  user: typeof users.$inferSelect | null,
) {
  if (userId.startsWith("legacy-poll:")) {
    return {
      username: "Legacy Member",
      profileImage: undefined,
      isRegular: false,
      profileUsername: null,
    };
  }

  if (!user) {
    return {
      username: "Deleted member",
      profileImage: undefined,
      isRegular: false,
      profileUsername: null,
    };
  }

  return {
    username: user.name,
    profileImage: user.image ?? undefined,
    isRegular: user.regular,
    profileUsername: user.username,
  };
}

function mapUserRating(
  rating: typeof userRatings.$inferSelect,
  user: typeof users.$inferSelect | null,
): UserRating {
  return {
    id: rating.id,
    contentId: rating.contentId,
    userId: rating.userId,
    rating: rating.rating,
    review: rating.review,
    edited: rating.edited,
    flagged: rating.flagged,
    restricted: rating.restricted,
    createdAt: rating.createdAt.toISOString(),
    updatedAt: rating.updatedAt.toISOString(),
    ...getDisplayUser(rating.userId, user),
  };
}

interface FeedReviewRow {
  rating: typeof userRatings.$inferSelect;
  title: string | null;
  contentType: ContentType | null;
  releaseDate: Date | null;
  posterImage: string | null;
  commentCount: number;
  user: typeof users.$inferSelect | null;
}

function mapFeedReview(row: FeedReviewRow): FeedReview {
  return {
    ...mapUserRating(row.rating, row.user),
    commentCount: Number(row.commentCount),
    film:
      row.title === null || row.contentType === null
        ? null
        : {
            title: row.title,
            contentType: row.contentType,
            releaseDate: toIsoString(row.releaseDate),
            posterImage: row.posterImage,
          },
  };
}

export class PublicReadRepository {
  constructor(private readonly database: AsyncSQLiteDatabase) {}

  async getMovieOfTheWeek(): Promise<Content | null> {
    const [row] = await this.database
      .select()
      .from(content)
      .where(eq(content.isMovieOfTheWeek, true))
      .limit(1);

    return row ? mapContent(row) : null;
  }

  async getMoviesAndTVSeries(limit = 20): Promise<Content[]> {
    const rows = await this.contentWithRatings(
      eq(content.isMovieOfTheWeek, false),
      limit,
    );
    return rows.map(mapContent);
  }

  async getAllContent(): Promise<Content[]> {
    const rows = await this.contentWithRatings();
    return rows.map(mapContent);
  }

  async getContentById(id: string): Promise<Content | null> {
    const [row] = await this.database
      .select({
        ...contentSelection,
        userRating: avg(userRatings.rating),
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .where(eq(content.id, id))
      .groupBy(content.id)
      .limit(1);

    return row ? mapContent(row) : null;
  }

  async getContentSlugIndex(): Promise<ContentSlugEntry[]> {
    const rows = await this.database
      .select({
        id: content.id,
        title: content.title,
        releaseDate: content.releaseDate,
      })
      .from(content);

    return rows.map((row) => ({
      ...row,
      releaseDate: toIsoString(row.releaseDate),
    }));
  }

  async getScoreboard({
    contentType,
    limit = 100,
  }: {
    contentType?: ContentType;
    limit?: number;
  } = {}): Promise<ScoreboardEntry[]> {
    const rows = await this.database
      .select({
        ...contentSelection,
        userRating: avg(userRatings.rating),
        ratingsCount: count(userRatings.id),
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .where(contentType ? eq(content.contentType, contentType) : undefined)
      .groupBy(content.id)
      .having(sql`avg(${userRatings.rating}) IS NOT NULL`)
      .orderBy(desc(sql`avg(${userRatings.rating})`))
      .limit(limit);

    return rows.map((row) => ({
      ...mapContent(row),
      ratingsCount: Number(row.ratingsCount),
    }));
  }

  async getTrendingReviews({
    limit = 12,
    offset = 0,
    now = new Date(),
  }: {
    limit?: number;
    offset?: number;
    now?: Date;
  } = {}): Promise<FeedReview[]> {
    const rows = await this.database
      .select({
        rating: userRatings,
        title: content.title,
        contentType: content.contentType,
        releaseDate: content.releaseDate,
        posterImage: content.legacyPosterImage,
        commentCount: count(comments.id),
        user: users,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .leftJoin(
        comments,
        and(
          eq(comments.reviewId, userRatings.id),
          eq(comments.restricted, false),
        ),
      )
      .leftJoin(users, eq(userRatings.userId, users.id))
      .where(visibleFeedReviews)
      .groupBy(userRatings.id, content.id, users.id);

    return rows
      .map((row) => {
        const commentCount = Number(row.commentCount);
        const ageHours =
          (now.getTime() - row.rating.createdAt.getTime()) / 3_600_000;
        const hotScore =
          (commentCount + 1) / Math.pow(ageHours + 2, 1.5);

        return {
          hotScore,
          review: mapFeedReview({ ...row, commentCount }),
        };
      })
      .sort((left, right) => right.hotScore - left.hotScore)
      .slice(offset, offset + limit)
      .map(({ review }) => review);
  }

  async countTrendingReviews(): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(userRatings)
      .where(visibleFeedReviews);

    return Number(row?.total ?? 0);
  }

  async getFeedReviewById(id: string): Promise<FeedReview | null> {
    const [row] = await this.database
      .select({
        rating: userRatings,
        title: content.title,
        contentType: content.contentType,
        releaseDate: content.releaseDate,
        posterImage: content.legacyPosterImage,
        commentCount: count(comments.id),
        user: users,
      })
      .from(userRatings)
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .leftJoin(
        comments,
        and(
          eq(comments.reviewId, userRatings.id),
          eq(comments.restricted, false),
        ),
      )
      .leftJoin(users, eq(userRatings.userId, users.id))
      .where(and(eq(userRatings.id, id), eq(userRatings.restricted, false)))
      .groupBy(userRatings.id, content.id, users.id)
      .limit(1);

    return row ? mapFeedReview(row) : null;
  }

  async getVisibleCommentsForReview(
    reviewId: string,
  ): Promise<CommentRecord[]> {
    const rows = await this.database
      .select({ comment: comments, user: users })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(
        and(
          eq(comments.reviewId, reviewId),
          eq(comments.restricted, false),
        ),
      )
      .orderBy(asc(comments.createdAt));

    return rows.map(({ comment, user }) => {
      const display = getDisplayUser(comment.userId, user);
      return {
        id: comment.id,
        reviewId: comment.reviewId,
        parentId: comment.parentId,
        userId: comment.userId,
        body: comment.body,
        depth: comment.depth,
        createdAt: comment.createdAt.toISOString(),
        username: display.username,
        profileImage: display.profileImage,
      };
    });
  }

  async targetExists(
    targetType: "review" | "comment",
    targetId: string,
  ): Promise<boolean> {
    const table = targetType === "review" ? userRatings : comments;
    const [row] = await this.database
      .select({ id: table.id })
      .from(table)
      .where(eq(table.id, targetId))
      .limit(1);
    return row !== undefined;
  }

  async contentExists(id: string): Promise<boolean> {
    const [row] = await this.database
      .select({ id: content.id })
      .from(content)
      .where(eq(content.id, id))
      .limit(1);
    return row !== undefined;
  }

  async getRatingId(
    contentId: string,
    userId: string,
  ): Promise<string | null> {
    const [row] = await this.database
      .select({ id: userRatings.id })
      .from(userRatings)
      .where(
        and(eq(userRatings.contentId, contentId), eq(userRatings.userId, userId)),
      )
      .limit(1);
    return row?.id ?? null;
  }

  async getReviewForComment(
    reviewId: string,
  ): Promise<{ restricted: boolean } | null> {
    const [row] = await this.database
      .select({ restricted: userRatings.restricted })
      .from(userRatings)
      .where(eq(userRatings.id, reviewId))
      .limit(1);
    return row ? { restricted: row.restricted } : null;
  }

  async getCommentParent(
    parentId: string,
  ): Promise<{
    reviewId: string;
    depth: number;
    restricted: boolean;
  } | null> {
    const [row] = await this.database
      .select({
        reviewId: comments.reviewId,
        depth: comments.depth,
        restricted: comments.restricted,
      })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);
    return row ?? null;
  }

  async getUserRatingsForContent(contentId: string): Promise<UserRating[]> {
    const rows = await this.database
      .select({ rating: userRatings, user: users })
      .from(userRatings)
      .leftJoin(users, eq(userRatings.userId, users.id))
      .where(eq(userRatings.contentId, contentId))
      .orderBy(asc(userRatings.createdAt));

    return rows.map((row) => mapUserRating(row.rating, row.user));
  }

  async getCriticReviewsForContent(
    contentId: string,
  ): Promise<CriticReview[]> {
    const rows = await this.database
      .select()
      .from(reviews)
      .where(eq(reviews.contentId, contentId))
      .orderBy(
        sql`${reviews.publishedAt} IS NULL`,
        desc(reviews.publishedAt),
        desc(reviews.createdAt),
      );

    return rows.map((row) => ({
      id: row.id,
      contentId: row.contentId,
      title: row.title,
      description: row.description,
      score: row.scoreTenths === null ? null : row.scoreTenths / 10,
      reviewer: row.reviewer,
      externalUrl: row.externalUrl,
      reviewImage: row.legacyReviewImage,
      publishedAt: toIsoString(row.publishedAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getDiscussions(options: DiscussionPageOptions = {}) {
    return this.getAllDiscussions({ ...options, limit: options.limit ?? 20 });
  }

  async getAllDiscussions({
    limit = 20,
    offset = 0,
    now = new Date(),
  }: DiscussionPageOptions = {}): Promise<Discussion[]> {
    const rows = await this.database
      .select()
      .from(discussions)
      .leftJoin(content, eq(discussions.contentId, content.id))
      .where(visibleDiscussions(now))
      .orderBy(...newestDiscussionOrder)
      .limit(limit)
      .offset(offset);

    return rows.map((row) => mapDiscussion(row.discussions, row.content));
  }

  async countDiscussions(now = new Date()): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(discussions)
      .where(visibleDiscussions(now));

    return Number(row?.total ?? 0);
  }

  async getDiscussionsForContent(contentId: string): Promise<Discussion[]> {
    const rows = await this.database
      .select()
      .from(discussions)
      .leftJoin(content, eq(discussions.contentId, content.id))
      .where(eq(discussions.contentId, contentId))
      .orderBy(
        sql`${discussions.episodeNumber} IS NULL`,
        asc(discussions.episodeNumber),
        sql`${discussions.discussionDate} IS NULL`,
        asc(discussions.discussionDate),
        asc(discussions.createdAt),
      );

    return rows.map((row) => mapDiscussion(row.discussions, row.content));
  }

  private contentWithRatings(where?: SQL, limit?: number) {
    const query = this.database
      .select({
        ...contentSelection,
        userRating: avg(userRatings.rating),
      })
      .from(content)
      .leftJoin(userRatings, eq(content.id, userRatings.contentId))
      .where(where)
      .groupBy(content.id)
      .orderBy(
        sql`${content.catalogNumber} IS NULL`,
        desc(content.catalogNumber),
        desc(content.createdAt),
      );

    return limit === undefined ? query : query.limit(limit);
  }
}
