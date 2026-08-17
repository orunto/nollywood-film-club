import { REPORT_REASONS, REPORT_TARGETS } from "../db/schema";
import type { AtomicCommand, AtomicResult } from "../services/contracts";

export type ReportTarget = (typeof REPORT_TARGETS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportTargetInput {
  targetType: ReportTarget;
  targetId: string;
  reporterId: string;
  reason: ReportReason;
  note: string | null;
}

export type ReportResult =
  | { status: "created" }
  | { status: "already-reported" }
  | { status: "target-missing" };

export const MAX_COMMENT_DEPTH = 5;

export interface RatingInput {
  contentId: string;
  userId: string;
  rating: number;
  review: string | null;
}

export type RatingUpsertResult =
  | { status: "created"; id: string }
  | { status: "updated"; id: string };

export interface CommentInput {
  reviewId: string;
  userId: string;
  parentId: string | null;
  body: string;
}

export type CommentResult =
  | { status: "created"; id: string }
  | { status: "review-missing" }
  | { status: "review-restricted" }
  | { status: "parent-missing" }
  | { status: "parent-wrong-review" }
  | { status: "parent-restricted" }
  | { status: "too-deep" };

export interface CommunityWriteAccess {
  publicReads: {
    targetExists(targetType: ReportTarget, targetId: string): Promise<boolean>;
    getRatingId(contentId: string, userId: string): Promise<string | null>;
    getReviewForComment(
      reviewId: string,
    ): Promise<{ restricted: boolean } | null>;
    getCommentParent(
      parentId: string,
    ): Promise<{
      reviewId: string;
      depth: number;
      restricted: boolean;
    } | null>;
  };
  atomic(commands: AtomicCommand[]): Promise<AtomicResult[]>;
}

export class CommunityWriteRepository {
  constructor(private readonly access: CommunityWriteAccess) {}

  // Records a report and flags the target in one transaction. The reports
  // table is polymorphic and has no foreign key, so the target is confirmed to
  // exist first. Unique on (reporter, target, targetId): reporting twice is an
  // idempotent no-op rather than an error. Flagging stays a separate concern
  // from restricting, which only admins can do.
  async reportTarget(input: ReportTargetInput): Promise<ReportResult> {
    if (
      !(await this.access.publicReads.targetExists(
        input.targetType,
        input.targetId,
      ))
    ) {
      return { status: "target-missing" };
    }

    const note =
      typeof input.note === "string" && input.note.trim()
        ? input.note.trim()
        : null;
    const now = Date.now();
    const targetTable =
      input.targetType === "review" ? "user_ratings" : "comments";

    const results = await this.access.atomic([
      {
        sql: `
          INSERT INTO reports (
            id, target_type, target_id, reporter_id, reason, note, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (reporter_id, target_type, target_id) DO NOTHING
        `,
        params: [
          crypto.randomUUID(),
          input.targetType,
          input.targetId,
          input.reporterId,
          input.reason,
          note,
          now,
        ],
      },
      {
        sql: `
          UPDATE ${targetTable}
          SET flagged = 1, updated_at = ?
          WHERE id = ?
        `,
        params: [now, input.targetId],
      },
    ]);

    return {
      status: results[0].changes === 1 ? "created" : "already-reported",
    };
  }

  // Inserts a rating or updates the existing one for (content, user) in one
  // statement against the user_ratings_content_user_unique index. The edited
  // flag stays off for a fresh review and flips on for every later change.
  async upsertRating(input: RatingInput): Promise<RatingUpsertResult> {
    const existingId = await this.access.publicReads.getRatingId(
      input.contentId,
      input.userId,
    );
    const id = existingId ?? crypto.randomUUID();
    const review =
      typeof input.review === "string" && input.review.trim()
        ? input.review
        : null;
    const now = Date.now();

    await this.access.atomic([
      {
        sql: `
          INSERT INTO user_ratings (
            id, content_id, user_id, rating, review, edited, flagged,
            restricted, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
          ON CONFLICT (content_id, user_id) DO UPDATE SET
            rating = excluded.rating,
            review = excluded.review,
            edited = 1,
            updated_at = excluded.updated_at
        `,
        params: [
          id,
          input.contentId,
          input.userId,
          input.rating,
          review,
          now,
          now,
        ],
      },
    ]);

    return { status: existingId ? "updated" : "created", id };
  }

  async deleteRating(id: string, userId: string): Promise<boolean> {
    const results = await this.access.atomic([
      {
        sql: "DELETE FROM user_ratings WHERE id = ? AND user_id = ?",
        params: [id, userId],
      },
    ]);
    return results[0].changes > 0;
  }

  // Partial update of one of the caller's own ratings by id (the PUT on
  // /api/user/ratings/[id]). Returns false when the row isn't theirs — a
  // 404, same as a missing row, so ids can't be probed for ownership.
  async updateRating(
    id: string,
    userId: string,
    input: { rating: number; review: string | null },
  ): Promise<boolean> {
    const now = Date.now();
    const results = await this.access.atomic([
      {
        sql: `
          UPDATE user_ratings
          SET rating = ?, review = ?, edited = 1, updated_at = ?
          WHERE id = ? AND user_id = ?
        `,
        params: [input.rating, input.review, now, id, userId],
      },
    ]);
    return results[0].changes > 0;
  }

  // Posts a comment or reply. The review must exist and remain public, and the
  // parent (when present) must sit under the same review and still be public.
  // Depth is derived from the parent, never trusted from the client.
  async addComment(input: CommentInput): Promise<CommentResult> {
    const review = await this.access.publicReads.getReviewForComment(
      input.reviewId,
    );
    if (!review) {
      return { status: "review-missing" };
    }
    if (review.restricted) {
      return { status: "review-restricted" };
    }

    let depth = 0;
    if (input.parentId) {
      const parent = await this.access.publicReads.getCommentParent(
        input.parentId,
      );
      if (!parent) {
        return { status: "parent-missing" };
      }
      if (parent.reviewId !== input.reviewId) {
        return { status: "parent-wrong-review" };
      }
      if (parent.restricted) {
        return { status: "parent-restricted" };
      }
      depth = parent.depth + 1;
      if (depth > MAX_COMMENT_DEPTH) {
        return { status: "too-deep" };
      }
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    await this.access.atomic([
      {
        sql: `
          INSERT INTO comments (
            id, review_id, parent_id, user_id, body, depth, flagged,
            restricted, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `,
        params: [
          id,
          input.reviewId,
          input.parentId,
          input.userId,
          input.body,
          depth,
          now,
          now,
        ],
      },
    ]);

    return { status: "created", id };
  }

  // Deleting a comment removes its replies too, via the ON DELETE CASCADE on
  // comments.parent_id.
  async deleteComment(id: string, userId: string): Promise<boolean> {
    const results = await this.access.atomic([
      {
        sql: "DELETE FROM comments WHERE id = ? AND user_id = ?",
        params: [id, userId],
      },
    ]);
    return results[0].changes > 0;
  }
}