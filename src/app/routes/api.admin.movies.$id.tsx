import type { Route } from "./+types/api.admin.movies.$id";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { parseContent } from "./api.admin.movies";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  if (request.method === "DELETE") {
    if (!await services.db.adminContent.delete(params.id)) return Response.json({ success: false, error: "Movie not found" }, { status: 404 });
    return Response.json({ success: true, message: "Movie deleted successfully" });
  }
  const row = await services.db.adminContent.update(params.id, parseContent(await request.json()));
  if (!row) return Response.json({ success: false, error: "Movie not found" }, { status: 404 });
  return Response.json({ success: true, data: row, message: "Movie updated successfully" });
}
