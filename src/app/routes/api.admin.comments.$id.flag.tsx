import type { Route } from "./+types/api.admin.comments.$id.flag";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = (await request.json()) as { flagged?: unknown };
  if (typeof body.flagged !== "boolean") return Response.json({ success: false, error: "flagged must be a boolean" }, { status: 400 });
  const updated = await services.db.adminModeration.setCommentFlag(params.id, body.flagged);
  if (!updated) return Response.json({ success: false, error: "Comment not found" }, { status: 404 });
  return Response.json({ success: true, data: updated, message: body.flagged ? "Comment flagged" : "Comment unflagged" });
}
