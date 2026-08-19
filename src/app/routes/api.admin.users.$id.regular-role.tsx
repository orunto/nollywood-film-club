import type { Route } from "./+types/api.admin.users.$id.regular-role";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;

  const body = (await request.json()) as { regular?: unknown };
  if (typeof body.regular !== "boolean") {
    return Response.json(
      { success: false, error: "regular must be a boolean" },
      { status: 400 },
    );
  }

  const result = await services.db.adminUsers.setRegular(params.id, body.regular);
  if (result.status === "missing") {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }
  if (result.status !== "ok") return Response.json({ success: false }, { status: 400 });
  return Response.json({ success: true, message: result.message });
}
