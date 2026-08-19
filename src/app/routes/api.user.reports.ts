import type { Route } from "./+types/api.user.reports";
import { appServicesContext } from "../context";
import {
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from "../../lib/comments";

const TARGET_TYPES: readonly ReportTarget[] = ["review", "comment"];
const REASONS = REPORT_REASONS.map((r) => r.value) as readonly string[];

// Reports a review or a comment to the admins.
// Body: { targetType, targetId, reason, note? }
export async function action({ request, context }: Route.ActionArgs) {
  const services = context.get(appServicesContext);

  try {
    const session = await services.auth.getSession(request);
    if (!session) {
      return Response.json({ success: false, error: "Sign in first." }, { status: 401 });
    }

    const { targetType, targetId, reason, note } = (await request.json()) as {
      targetType?: unknown;
      targetId?: unknown;
      reason?: unknown;
      note?: unknown;
    };

    if (
      typeof targetType !== "string" ||
      !TARGET_TYPES.includes(targetType as ReportTarget)
    ) {
      return Response.json(
        { success: false, error: "Unknown report target" },
        { status: 400 },
      );
    }
    if (typeof targetId !== "string" || !targetId) {
      return Response.json(
        { success: false, error: "A targetId is required" },
        { status: 400 },
      );
    }
    if (typeof reason !== "string" || !REASONS.includes(reason)) {
      return Response.json(
        { success: false, error: "Pick a reason for the report" },
        { status: 400 },
      );
    }

    const result = await services.db.writes.reportTarget({
      targetType: targetType as ReportTarget,
      targetId,
      reporterId: session.userId,
      reason: reason as ReportReason,
      note: typeof note === "string" ? note : null,
    });

    if (result.status === "target-missing") {
      return Response.json(
        { success: false, error: "That post no longer exists" },
        { status: 404 },
      );
    }

    // reporting twice is a no-op rather than an error, so the button stays
    // idempotent.
    return Response.json({
      success: true,
      message: "Reported. The admins will take a look.",
    });
  } catch (error) {
    console.error("Error creating report:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}