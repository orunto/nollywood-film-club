import { desc, eq, inArray, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { content, discussionContent, discussions } from "../db/schema";
import type { AtomicCommand, AtomicResult } from "../services/contracts";
import { allCatalogNumbersSyncCommand } from "./catalog-write";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;
const MAX_CONTENT_LINKS = 40;

interface DiscussionWriteAccess {
  atomic(commands: AtomicCommand[]): Promise<AtomicResult[]>;
}

export interface DiscussionInput {
  title: string;
  description: string | null;
  contentIds: string[];
  spaceUrl: string | null;
  podcastLinks: string[];
  episodeNumber: number | null;
  discussionDate: string | null;
}

export type AdminDiscussion = typeof discussions.$inferSelect & {
  contentIds: string[];
};

export class AdminDiscussionsRepository {
  constructor(
    private readonly database: Database,
    private readonly access: DiscussionWriteAccess,
  ) {}

  async list(): Promise<AdminDiscussion[]> {
    const [rows, links] = await Promise.all([
      this.database
        .select()
        .from(discussions)
        .orderBy(
          sql`${discussions.episodeNumber} DESC NULLS LAST`,
          desc(discussions.createdAt),
        ),
      this.database.select().from(discussionContent),
    ]);
    const contentIdsByDiscussion = new Map<string, string[]>();
    for (const link of links) {
      const ids = contentIdsByDiscussion.get(link.discussionId) ?? [];
      ids.push(link.contentId);
      contentIdsByDiscussion.set(link.discussionId, ids);
    }
    return rows.map((row) => ({
      ...row,
      contentIds: contentIdsByDiscussion.get(row.id) ?? [],
    }));
  }

  async create(input: DiscussionInput): Promise<AdminDiscussion> {
    const contentIds = await this.validContentIds(input.contentIds);
    const id = crypto.randomUUID();
    const now = Date.now();
    const commands = this.writeCommands(id, input, contentIds, now, true);
    commands.push(allCatalogNumbersSyncCommand(now));
    await this.access.atomic(commands);
    return (await this.find(id))!;
  }

  async update(id: string, input: DiscussionInput): Promise<AdminDiscussion | null> {
    const existing = await this.find(id);
    if (!existing) return null;
    const contentIds = await this.validContentIds(input.contentIds);
    const now = Date.now();
    const commands = this.writeCommands(id, input, contentIds, now, false);
    commands.push(allCatalogNumbersSyncCommand(now));
    await this.access.atomic(commands);
    return this.find(id);
  }

  async replaceContentLinks(id: string, requestedContentIds: string[]): Promise<AdminDiscussion | null> {
    const existing = await this.find(id);
    if (!existing) return null;
    const contentIds = await this.validContentIds(requestedContentIds);
    const now = Date.now();
    const commands: AtomicCommand[] = [
      { sql: "DELETE FROM discussion_content WHERE discussion_id = ?", params: [id] },
      ...this.linkCommands(id, contentIds),
      { sql: "UPDATE discussions SET updated_at = ? WHERE id = ?", params: [now, id] },
    ];
    commands.push(allCatalogNumbersSyncCommand(now));
    await this.access.atomic(commands);
    return this.find(id);
  }

  async delete(id: string): Promise<AdminDiscussion | null> {
    const existing = await this.find(id);
    if (!existing) return null;
    const commands: AtomicCommand[] = [
      { sql: "DELETE FROM discussions WHERE id = ?", params: [id] },
    ];
    commands.push(allCatalogNumbersSyncCommand());
    await this.access.atomic(commands);
    return existing;
  }

  async replaceDiscussionsForContent(
    contentId: string,
    requestedDiscussionIds: string[],
  ): Promise<boolean> {
    const [contentRow] = await this.database
      .select({ id: content.id })
      .from(content)
      .where(eq(content.id, contentId))
      .limit(1);
    if (!contentRow) return false;
    const discussionIds = [...new Set(requestedDiscussionIds.filter(Boolean))];
    if (discussionIds.length > MAX_CONTENT_LINKS) {
      throw new Error(`A content item can link to at most ${MAX_CONTENT_LINKS} discussions`);
    }
    if (discussionIds.length > 0) {
      const rows = await this.database
        .select({ id: discussions.id })
        .from(discussions)
        .where(inArray(discussions.id, discussionIds));
      if (rows.length !== discussionIds.length) {
        throw new Error("One or more discussions were not found");
      }
    }
    const now = Date.now();
    await this.access.atomic([
      { sql: "DELETE FROM discussion_content WHERE content_id = ?", params: [contentId] },
      ...discussionIds.map((discussionId) => ({
        sql: "INSERT INTO discussion_content (discussion_id, content_id) VALUES (?, ?)",
        params: [discussionId, contentId],
      })),
      ...discussionIds.map((discussionId) => ({
        sql: "UPDATE discussions SET updated_at = ? WHERE id = ?",
        params: [now, discussionId],
      })),
      allCatalogNumbersSyncCommand(now),
    ]);
    return true;
  }

  private writeCommands(
    id: string,
    input: DiscussionInput,
    contentIds: string[],
    now: number,
    create: boolean,
  ): AtomicCommand[] {
    const discussionDate = input.discussionDate ? new Date(input.discussionDate).getTime() : null;
    const values = [
      input.title,
      input.description,
      input.spaceUrl,
      JSON.stringify(input.podcastLinks),
      input.episodeNumber,
      discussionDate,
    ];
    const discussionCommand: AtomicCommand = create
      ? {
          sql: `INSERT INTO discussions (
            title, description, space_url, podcast_links, episode_number,
            discussion_date, id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [...values, id, now, now],
        }
      : {
          sql: `UPDATE discussions SET
            title = ?, description = ?, space_url = ?, podcast_links = ?,
            episode_number = ?, discussion_date = ?, updated_at = ?
            WHERE id = ?`,
          params: [...values, now, id],
        };
    return [
      discussionCommand,
      ...(!create
        ? [{ sql: "DELETE FROM discussion_content WHERE discussion_id = ?", params: [id] }]
        : []),
      ...this.linkCommands(id, contentIds),
    ];
  }

  private linkCommands(discussionId: string, contentIds: string[]): AtomicCommand[] {
    return contentIds.map((contentId) => ({
      sql: "INSERT INTO discussion_content (discussion_id, content_id) VALUES (?, ?)",
      params: [discussionId, contentId],
    }));
  }

  private async find(id: string): Promise<AdminDiscussion | null> {
    const [row] = await this.database.select().from(discussions).where(eq(discussions.id, id)).limit(1);
    if (!row) return null;
    const links = await this.database
      .select({ contentId: discussionContent.contentId })
      .from(discussionContent)
      .where(eq(discussionContent.discussionId, id));
    return { ...row, contentIds: links.map((link) => link.contentId) };
  }

  private async validContentIds(requested: string[]): Promise<string[]> {
    const ids = [...new Set(requested.filter(Boolean))];
    if (ids.length > MAX_CONTENT_LINKS) {
      throw new Error(`A discussion can link to at most ${MAX_CONTENT_LINKS} content items`);
    }
    if (ids.length === 0) return [];
    const rows = await this.database
      .select({ id: content.id })
      .from(content)
      .where(inArray(content.id, ids));
    if (rows.length !== ids.length) throw new Error("One or more content items were not found");
    return ids;
  }
}
