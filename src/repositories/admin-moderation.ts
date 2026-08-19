import { desc, eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { comments, content, userRatings, users } from "../db/schema";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export class AdminModerationRepository {
  constructor(private readonly database: Database) {}

  async listRatings() {
    return this.database
      .select({ rating: userRatings, user: users, film: content })
      .from(userRatings)
      .leftJoin(users, eq(userRatings.userId, users.id))
      .leftJoin(content, eq(userRatings.contentId, content.id))
      .orderBy(desc(userRatings.createdAt));
  }

  async listComments() {
    return this.database
      .select({ comment: comments, user: users })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .orderBy(desc(comments.createdAt));
  }

  async setRatingFlag(id: string, flagged: boolean) {
    await this.database
      .update(userRatings)
      .set({ flagged, updatedAt: new Date() })
      .where(eq(userRatings.id, id));
    return this.findRating(id);
  }

  async setRatingRestriction(id: string, restricted: boolean) {
    await this.database
      .update(userRatings)
      .set({ restricted, updatedAt: new Date() })
      .where(eq(userRatings.id, id));
    return this.findRating(id);
  }

  async setCommentFlag(id: string, flagged: boolean) {
    await this.database
      .update(comments)
      .set({ flagged, updatedAt: new Date() })
      .where(eq(comments.id, id));
    return this.findComment(id);
  }

  async setCommentRestriction(id: string, restricted: boolean) {
    await this.database
      .update(comments)
      .set({ restricted, updatedAt: new Date() })
      .where(eq(comments.id, id));
    return this.findComment(id);
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
