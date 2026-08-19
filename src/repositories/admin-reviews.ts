import { asc, eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { reviews } from "../db/schema";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;
export interface ReviewInput {
  contentId: string;
  title: string;
  description: string;
  score: number | null;
  reviewer: string;
  externalUrl: string | null;
  reviewImage: string | null;
  publishedAt: string | null;
}

function scoreTenths(score: number | null) {
  if (score === null) return null;
  if (!Number.isFinite(score) || score < 0 || score > 10) throw new Error("Invalid review score");
  return Math.round(score * 10);
}

export class AdminReviewsRepository {
  constructor(private readonly database: Database) {}

  async list() {
    return this.database.select().from(reviews).orderBy(asc(reviews.publishedAt));
  }

  async create(input: ReviewInput) {
    const [review] = await this.database.insert(reviews).values({
      id: crypto.randomUUID(),
      contentId: input.contentId,
      title: input.title,
      description: input.description,
      scoreTenths: scoreTenths(input.score),
      reviewer: input.reviewer,
      externalUrl: input.externalUrl,
      legacyReviewImage: input.reviewImage,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    }).returning();
    return review;
  }

  async update(id: string, input: ReviewInput) {
    const [review] = await this.database.update(reviews).set({
      contentId: input.contentId,
      title: input.title,
      description: input.description,
      scoreTenths: scoreTenths(input.score),
      reviewer: input.reviewer,
      externalUrl: input.externalUrl,
      legacyReviewImage: input.reviewImage,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      updatedAt: new Date(),
    }).where(eq(reviews.id, id)).returning();
    return review ?? null;
  }

  async delete(id: string) {
    const [review] = await this.database.delete(reviews).where(eq(reviews.id, id)).returning({ id: reviews.id });
    return review !== undefined;
  }
}
