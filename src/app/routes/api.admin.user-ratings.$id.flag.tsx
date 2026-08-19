import type { Route } from "./+types/api.admin.user-ratings.$id.flag";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import type { AppServices } from "../../services/contracts";

export async function action({ context, params, request }: Route.ActionArgs) {
  return updateFlag(context.get(appServicesContext), request, params.id);
}

async function updateFlag(services: AppServices, request: Request, id: string): Promise<Response> {
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = (await request.json()) as { flagged?: unknown };
  if (typeof body.flagged !== "boolean") return Response.json({ success: false, error: "flagged must be a boolean" }, { status: 400 });
  const updated = await services.db.adminModeration.setRatingFlag(id, body.flagged);
  if (!updated) return Response.json({ success: false, error: "Review not found" }, { status: 404 });
  return Response.json({ success: true, data: updated, message: body.flagged ? "Review flagged" : "Review unflagged" });
}
