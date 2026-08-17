import type { Route } from "./+types/api.admin.discussions.$id";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { parseDiscussion } from "./api.admin.discussions";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  if (request.method === "DELETE") {
    const deleted = await services.db.adminDiscussions.delete(params.id);
    if (!deleted) return Response.json({ success: false, error: "Discussion not found" }, { status: 404 });
    return Response.json({ success: true, message: "Discussion deleted successfully" });
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (request.method === "PATCH") {
    const updated = await services.db.adminDiscussions.link(params.id, typeof body.contentId === "string" ? body.contentId : null);
    if (!updated) return Response.json({ success: false, error: "Discussion not found" }, { status: 404 });
    return Response.json({ success: true, data: updated, message: body.contentId ? "Discussion linked to content" : "Discussion unlinked from content" });
  }
  const updated = await services.db.adminDiscussions.update(params.id, parseDiscussion(body));
  if (!updated) return Response.json({ success: false, error: "Discussion not found" }, { status: 404 });
  return Response.json({ success: true, data: updated, message: "Discussion updated successfully" });
}
