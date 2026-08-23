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
  try {
    if (request.method === "PATCH") {
      if (!Array.isArray(body.contentIds) || body.contentIds.some((id) => typeof id !== "string")) {
        return Response.json({ success: false, error: "contentIds must be an array of strings" }, { status: 400 });
      }
      const updated = await services.db.adminDiscussions.replaceContentLinks(params.id, body.contentIds as string[]);
      if (!updated) return Response.json({ success: false, error: "Discussion not found" }, { status: 404 });
      return Response.json({ success: true, data: updated, message: "Discussion content links updated" });
    }
    if (typeof body.title !== "string" || !body.title.trim()) {
      return Response.json({ success: false, error: "Title is required and must be a string" }, { status: 400 });
    }
    if (!Array.isArray(body.contentIds) || body.contentIds.some((id) => typeof id !== "string")) {
      return Response.json({ success: false, error: "contentIds must be an array of strings" }, { status: 400 });
    }
    const updated = await services.db.adminDiscussions.update(params.id, parseDiscussion(body));
    if (!updated) return Response.json({ success: false, error: "Discussion not found" }, { status: 404 });
    return Response.json({ success: true, data: updated, message: "Discussion updated successfully" });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Could not update discussion" }, { status: 400 });
  }
}
