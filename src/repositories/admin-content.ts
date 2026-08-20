import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { content, media, RATINGS, STREAMING_PLATFORMS, VIEWING_CATEGORIES } from "../db/schema";
import { mediaObjectKey } from "../lib/media";
import type { CatalogWriteRepository } from "./catalog-write";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;
export interface ContentInput { title: string; contentType: "movie" | "tv_show" | "short_film"; runtime: number | null; releaseDate: string | null; rating: (typeof RATINGS)[number] | null; synopsis: string | null; genre: string[]; posterImage: string | null; posterVersion: number | null; trailerUrl: string | null; streamingUrl: string | null; streamingPlatform: (typeof STREAMING_PLATFORMS)[number] | null; otherPlatform: string | null; viewingCategory: (typeof VIEWING_CATEGORIES)[number] | null; castMembers: unknown; isMovieOfTheWeek: boolean; }

export class AdminContentRepository {
  constructor(private readonly database: Database, private readonly catalog: CatalogWriteRepository) {}
  async list() { return this.database.select({ ...getTableColumns(content), posterObjectKey: media.objectKey }).from(content).leftJoin(media, eq(content.posterMediaId, media.id)).orderBy(sql`${content.catalogNumber} DESC NULLS LAST`, desc(content.createdAt)); }
  async create(input: ContentInput) { if (input.isMovieOfTheWeek) await this.database.update(content).set({ isMovieOfTheWeek: false, updatedAt: new Date() }).where(eq(content.isMovieOfTheWeek, true)); const [row] = await this.database.insert(content).values({ id: crypto.randomUUID(), ...await this.values(input) }).returning(); return (await this.find(row.id))!; }
  async update(id: string, input: ContentInput) { if (input.isMovieOfTheWeek) await this.catalog.setMovieOfTheWeek(id, true); const [row] = await this.database.update(content).set({ ...await this.values(input), updatedAt: new Date() }).where(eq(content.id, id)).returning(); return row ? this.find(row.id) : null; }
  async setMovieOfTheWeek(id: string, promote: boolean) { return this.catalog.setMovieOfTheWeek(id, promote); }
  async delete(id: string) { const [row] = await this.database.delete(content).where(eq(content.id, id)).returning({ id: content.id }); return row !== undefined; }
  private async find(id: string) { const [row] = await this.database.select({ ...getTableColumns(content), posterObjectKey: media.objectKey }).from(content).leftJoin(media, eq(content.posterMediaId, media.id)).where(eq(content.id, id)).limit(1); return row ?? null; }
  private async values(input: ContentInput) { const objectKey = mediaObjectKey(input.posterImage); let posterMediaId: string | null = null; if (objectKey) { const [poster] = await this.database.select({ id: media.id }).from(media).where(eq(media.objectKey, objectKey)).limit(1); if (!poster) throw new Error("Uploaded poster media was not found"); posterMediaId = poster.id; } return { title: input.title, contentType: input.contentType, runtime: input.runtime, releaseDate: input.releaseDate ? new Date(input.releaseDate) : null, rating: input.rating || null, synopsis: input.synopsis, genre: input.genre, posterMediaId, legacyPosterImage: posterMediaId ? null : input.posterImage || null, legacyPosterVersion: posterMediaId ? null : input.posterVersion, trailerUrl: input.trailerUrl, streamingUrl: input.streamingUrl, streamingPlatform: input.streamingPlatform || null, otherPlatform: input.otherPlatform, viewingCategory: input.viewingCategory || null, castMembers: input.castMembers as schema.CastMember[] | null, isMovieOfTheWeek: input.isMovieOfTheWeek }; }
}
