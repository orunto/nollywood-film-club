import type { Route } from "./+types/api.admin.movies.$id.discussions";
import { requireAdmin } from "../admin-auth";
import { appServicesContext } from "../context";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  if (request.method !== "PUT") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  if (!Array.isArray(body.discussionIds) || body.discussionIds.some((id) => typeof id !== "string")) {
    return Response.json({ success: false, error: "discussionIds must be an array of strings" }, { status: 400 });
  }
  try {
    const updated = await services.db.adminDiscussions.replaceDiscussionsForContent(
      params.id,
      body.discussionIds as string[],
    );
    if (!updated) {
      return Response.json({ success: false, error: "Content not found" }, { status: 404 });
    }
    return Response.json({ success: true, message: "Discussion links updated" });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Could not update discussion links" }, { status: 400 });
  }
}
