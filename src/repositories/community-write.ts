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

export interface CommunityWriteAccess {
  publicReads: {
    targetExists(targetType: ReportTarget, targetId: string): Promise<boolean>;
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
}