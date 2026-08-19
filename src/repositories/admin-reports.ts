import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { comments, content, reports, userRatings, users } from "../db/schema";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;
const STATUSES = ["open", "actioned", "dismissed"] as const;
type Status = (typeof STATUSES)[number];

export interface AdminReport {
  id: string;
  targetType: "review" | "comment";
  targetId: string;
  reason: string;
  note: string | null;
  status: Status;
  createdAt: string;
  reporterId: string;
  reporterName: string;
  targetBody: string | null;
  targetAuthor: string | null;
  targetFlagged: boolean;
  targetRestricted: boolean;
  contentTitle: string | null;
  reviewId: string | null;
}

export class AdminReportsRepository {
  constructor(private readonly database: Database) {}

  async list(): Promise<AdminReport[]> {
    const rows = await this.database
      .select({ report: reports, reporter: users })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .orderBy(asc(sql`CASE WHEN ${reports.status} = 'open' THEN 0 ELSE 1 END`), desc(reports.createdAt));
    const reviewIds = rows.filter(({ report }) => report.targetType === "review").map(({ report }) => report.targetId);
    const commentIds = rows.filter(({ report }) => report.targetType === "comment").map(({ report }) => report.targetId);
    const reviewRows = reviewIds.length
      ? await this.database.select({ id: userRatings.id, body: userRatings.review, userId: userRatings.userId, flagged: userRatings.flagged, restricted: userRatings.restricted, contentTitle: content.title }).from(userRatings).leftJoin(content, eq(userRatings.contentId, content.id)).where(inArray(userRatings.id, reviewIds))
      : [];
    const commentRows = commentIds.length
      ? await this.database.select({ id: comments.id, body: comments.body, userId: comments.userId, flagged: comments.flagged, restricted: comments.restricted, reviewId: comments.reviewId, contentTitle: content.title }).from(comments).leftJoin(userRatings, eq(comments.reviewId, userRatings.id)).leftJoin(content, eq(userRatings.contentId, content.id)).where(inArray(comments.id, commentIds))
      : [];
    const reviewMap = new Map(reviewRows.map((row) => [row.id, row]));
    const commentMap = new Map(commentRows.map((row) => [row.id, row]));
    const authorIds = [...rows.map(({ report }) => report.reporterId), ...reviewRows.map((row) => row.userId), ...commentRows.map((row) => row.userId)];
    const authorRows = authorIds.length ? await this.database.select({ id: users.id, username: users.username }).from(users).where(inArray(users.id, authorIds)) : [];
    const names = new Map(authorRows.map((row) => [row.id, row.username]));

    return rows.map(({ report, reporter }) => {
      const target = report.targetType === "review" ? reviewMap.get(report.targetId) : commentMap.get(report.targetId);
      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        note: report.note,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        reporterId: report.reporterId,
        reporterName: reporter?.username ?? "Deleted member",
        targetBody: target?.body ?? null,
        targetAuthor: target ? names.get(target.userId) ?? null : null,
        targetFlagged: target?.flagged ?? false,
        targetRestricted: target?.restricted ?? false,
        contentTitle: target?.contentTitle ?? null,
        reviewId: report.targetType === "review" ? report.targetId : commentMap.get(report.targetId)?.reviewId ?? null,
      };
    });
  }

  async setStatus(id: string, status: Status, resolvedBy: string) {
    if (!STATUSES.includes(status)) return { status: "invalid" as const };
    const [updated] = await this.database.update(reports).set({ status, resolvedBy: status === "open" ? null : resolvedBy, resolvedAt: status === "open" ? null : new Date() }).where(eq(reports.id, id)).returning();
    return updated ? { status: "ok" as const, report: updated } : { status: "missing" as const };
  }
}
