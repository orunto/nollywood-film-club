import { eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { media } from "../db/schema";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;
export class MediaRepository {
  constructor(private readonly database: Database) {}
  async create(input: { objectKey: string; publicId: string; version: number; mimeType: string; byteSize: number; checksum: string }) {
    const [row] = await this.database.insert(media).values({ id: crypto.randomUUID(), ...input, status: "ready", originalProvider: "runtime-upload" }).returning();
    return row;
  }
  async find(id: string) { const [row] = await this.database.select().from(media).where(eq(media.id, id)).limit(1); return row ?? null; }
}
