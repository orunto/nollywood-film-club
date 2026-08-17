import type { Route } from "./+types/api.admin.users.$id.admin-role";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;

  const body = (await request.json()) as { isAdmin?: unknown };
  if (typeof body.isAdmin !== "boolean") {
    return Response.json(
      { success: false, error: "isAdmin must be a boolean" },
      { status: 400 },
    );
  }

  const result = await services.db.adminUsers.setAdminRole(
    authorization.session.userId,
    params.id,
    body.isAdmin,
  );
  if (result.status === "missing") {
    return Response.json({ success: false, error: "User not found" }, { status: 404 });
  }
  if (result.status === "self-demotion") {
    return Response.json(
      { success: false, error: "You can't remove your own admin access" },
      { status: 400 },
    );
  }
  return Response.json({ success: true, message: result.message });
}
