import type { Route } from "./+types/api.admin.reviews.$id";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { parseReview } from "./api.admin.reviews";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  if (request.method === "DELETE") {
    const deleted = await services.db.adminReviews.delete(params.id);
    if (!deleted) return Response.json({ success: false, error: "Review not found" }, { status: 404 });
    return Response.json({ success: true, message: "Review deleted successfully" });
  }
  try {
    const updated = await services.db.adminReviews.update(params.id, parseReview(await request.json()));
    if (!updated) return Response.json({ success: false, error: "Review not found" }, { status: 404 });
    return Response.json({ success: true, data: updated, message: "Review updated successfully" });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Invalid review" }, { status: 400 });
  }
}
