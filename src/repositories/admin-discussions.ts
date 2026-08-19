import { desc, eq, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { discussions } from "../db/schema";
import type { CatalogWriteRepository } from "./catalog-write";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;
export interface DiscussionInput {
  title: string;
  description: string | null;
  contentId: string | null;
  spaceUrl: string | null;
  podcastLinks: string[];
  episodeNumber: number | null;
  discussionDate: string | null;
}

export class AdminDiscussionsRepository {
  constructor(private readonly database: Database, private readonly catalog: CatalogWriteRepository) {}

  async list() {
    return this.database.select().from(discussions).orderBy(sql`${discussions.episodeNumber} DESC NULLS LAST`, desc(discussions.createdAt));
  }

  async create(input: DiscussionInput) {
    const [discussion] = await this.database.insert(discussions).values({
      id: crypto.randomUUID(), ...input,
      discussionDate: input.discussionDate ? new Date(input.discussionDate) : null,
    }).returning();
    await this.catalog.syncCatalogNumbers([discussion.contentId]);
    return discussion;
  }

  async update(id: string, input: DiscussionInput) {
    const [existing] = await this.database.select({ contentId: discussions.contentId }).from(discussions).where(eq(discussions.id, id));
    const [discussion] = await this.database.update(discussions).set({ ...input, discussionDate: input.discussionDate ? new Date(input.discussionDate) : null, updatedAt: new Date() }).where(eq(discussions.id, id)).returning();
    if (!discussion) return null;
    await this.catalog.syncCatalogNumbers([existing?.contentId, discussion.contentId]);
    return discussion;
  }

  async link(id: string, contentId: string | null) {
    const [existing] = await this.database.select().from(discussions).where(eq(discussions.id, id));
    if (!existing) return null;
    const [updated] = await this.database.update(discussions).set({ contentId, updatedAt: new Date() }).where(eq(discussions.id, id)).returning();
    await this.catalog.syncCatalogNumbers([existing.contentId, contentId]);
    return updated ?? null;
  }

  async delete(id: string) {
    const [deleted] = await this.database.delete(discussions).where(eq(discussions.id, id)).returning();
    if (deleted) await this.catalog.syncCatalogNumbers([deleted.contentId]);
    return deleted ?? null;
  }
}
