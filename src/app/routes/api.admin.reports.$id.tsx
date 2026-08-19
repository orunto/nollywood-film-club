import type { Route } from "./+types/api.admin.reports.$id";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

const STATUSES = ["open", "actioned", "dismissed"] as const;

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = (await request.json()) as { status?: unknown };
  if (typeof body.status !== "string" || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return Response.json({ success: false, error: "Unknown report status" }, { status: 400 });
  }
  const result = await services.db.adminReports.setStatus(params.id, body.status as (typeof STATUSES)[number], authorization.session.userId);
  if (result.status === "missing") return Response.json({ success: false, error: "Report not found" }, { status: 404 });
  return Response.json({ success: true, data: result.report, message: body.status === "open" ? "Report reopened" : `Report ${body.status}` });
}
