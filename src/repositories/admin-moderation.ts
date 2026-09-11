import { desc, eq, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { cacheVersions, comments, content, userRatings, users } from "../db/schema";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export class AdminModerationRepository {
  constructor(private readonly database: Database) {}

  async listRatings(options: { limit?: number; offset?: number } = {}) {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    return this.database
      .select({ rating: userRatings, user: users, film: content })
      .from(userRatings)
      .leftJoin(users, eq(userRatings.userId, users.id))
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .orderBy(desc(userRatings.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async listComments(options: { limit?: number; offset?: number } = {}) {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    return this.database
      .select({ comment: comments, user: users })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .orderBy(desc(comments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async setRatingFlag(id: string, flagged: boolean) {
    await this.database
      .update(userRatings)
      .set({ flagged, updatedAt: new Date() })
      .where(eq(userRatings.id, id));
    await this.bumpCache(["content", "feed"]);
    return this.findRating(id);
  }

  async setRatingRestriction(id: string, restricted: boolean) {
    await this.database
      .update(userRatings)
      .set({ restricted, updatedAt: new Date() })
      .where(eq(userRatings.id, id));
    await this.bumpCache(["catalog", "scoreboard", "content", "feed", "members"]);
    return this.findRating(id);
  }

  async setCommentFlag(id: string, flagged: boolean) {
    await this.database
      .update(comments)
      .set({ flagged, updatedAt: new Date() })
      .where(eq(comments.id, id));
    await this.bumpCache(["feed"]);
    return this.findComment(id);
  }

  async setCommentRestriction(id: string, restricted: boolean) {
    await this.database
      .update(comments)
      .set({ restricted, updatedAt: new Date() })
      .where(eq(comments.id, id));
    await this.bumpCache(["feed"]);
    return this.findComment(id);
  }

  private async bumpCache(tags: string[]) {
    const now = new Date();
    for (const tag of tags) {
      await this.database
        .insert(cacheVersions)
        .values({ key: tag, version: 1, updatedAt: now })
        .onConflictDoUpdate({
          target: cacheVersions.key,
          set: { version: sql`${cacheVersions.version} + 1`, updatedAt: now },
        });
    }
  }

  private async findRating(id: string) {
    const [row] = await this.database
      .select()
      .from(userRatings)
      .where(eq(userRatings.id, id))
      .limit(1);
    return row ?? null;
  }

  private async findComment(id: string) {
    const [row] = await this.database
      .select()
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);
    return row ?? null;
  }
}
