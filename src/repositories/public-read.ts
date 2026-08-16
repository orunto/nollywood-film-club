import {
  asc,
  avg,
  count,
  desc,
  eq,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import {
  CONTENT_TYPES,
  content,
  discussions,
  userRatings,
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
