import { asc, eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { blogPosts } from "../db/schema";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;
export interface BlogInput { title: string; content: string; excerpt: string | null; slug: string; published: boolean; publishedAt: string | null; }

export class AdminBlogRepository {
  constructor(private readonly database: Database) {}
  async list() { return this.database.select().from(blogPosts).orderBy(asc(blogPosts.createdAt)); }
  async create(input: BlogInput) { const [post] = await this.database.insert(blogPosts).values({ id: crypto.randomUUID(), ...input, publishedAt: input.publishedAt ? new Date(input.publishedAt) : null }).returning(); return post; }
  async update(id: string, input: BlogInput) { const [post] = await this.database.update(blogPosts).set({ ...input, publishedAt: input.publishedAt ? new Date(input.publishedAt) : null, updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning(); return post ?? null; }
  async publish(id: string, published: boolean, publishedAt: string | null) { const [post] = await this.database.update(blogPosts).set({ published, publishedAt: published && publishedAt ? new Date(publishedAt) : null, updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning(); return post ?? null; }
  async delete(id: string) { const [post] = await this.database.delete(blogPosts).where(eq(blogPosts.id, id)).returning({ id: blogPosts.id }); return post !== undefined; }
}
