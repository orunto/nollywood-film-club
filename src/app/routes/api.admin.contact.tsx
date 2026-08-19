import type { Route } from "./+types/api.admin.contact";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  return Response.json({ success: true, data: await services.db.contacts.listForAdmin() });
}
