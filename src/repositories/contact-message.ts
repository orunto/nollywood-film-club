import { asc, desc, eq, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { contactMessages } from "../db/schema";
import * as schema from "../db/schema";
import type { ContactCategory } from "../lib/contact";

type AsyncSQLiteDatabase = BaseSQLiteDatabase<
  "async",
  unknown,
  typeof schema
>;

export interface ContactMessageInput {
  category: ContactCategory;
  message: string;
  email: string | null;
  userId: string | null;
}

export class ContactMessageRepository {
  constructor(private readonly database: AsyncSQLiteDatabase) {}

  async create(input: ContactMessageInput): Promise<void> {
    await this.database.insert(contactMessages).values({
      category: input.category,
      message: input.message,
      email: input.email,
      userId: input.userId,
    });
  }

  async listForAdmin() {
    return this.database
      .select()
      .from(contactMessages)
      .orderBy(
        asc(sql`CASE WHEN ${contactMessages.status} = 'open' THEN 0 ELSE 1 END`),
        desc(contactMessages.createdAt),
      );
  }

  async setStatus(id: string, status: "open" | "actioned" | "dismissed", resolvedBy: string) {
    const [updated] = await this.database
      .update(contactMessages)
      .set({
        status,
        resolvedBy: status === "open" ? null : resolvedBy,
        resolvedAt: status === "open" ? null : new Date(),
      })
      .where(eq(contactMessages.id, id))
      .returning();
    return updated ?? null;
  }
}
