import type { Route } from "./+types/api.admin.comments.$id.restrict";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = (await request.json()) as { restricted?: unknown };
  if (typeof body.restricted !== "boolean") return Response.json({ success: false, error: "restricted must be a boolean" }, { status: 400 });
  const updated = await services.db.adminModeration.setCommentRestriction(params.id, body.restricted);
  if (!updated) return Response.json({ success: false, error: "Comment not found" }, { status: 404 });
  return Response.json({ success: true, data: updated, message: body.restricted ? "Comment restricted" : "Comment restored" });
}
