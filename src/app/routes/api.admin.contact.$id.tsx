import type { Route } from "./+types/api.admin.contact.$id";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

const STATUSES = ["open", "actioned", "dismissed"] as const;

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = (await request.json()) as { status?: unknown };
  if (typeof body.status !== "string" || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return Response.json({ success: false, error: "Unknown status" }, { status: 400 });
  }
  const updated = await services.db.contacts.setStatus(params.id, body.status as (typeof STATUSES)[number], authorization.session.userId);
  if (!updated) return Response.json({ success: false, error: "Message not found" }, { status: 404 });
  return Response.json({ success: true, data: updated, message: body.status === "open" ? "Message reopened" : `Message ${body.status}` });
}
