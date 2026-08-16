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
}