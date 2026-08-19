import type { Route } from "./+types/api.admin.movies.$id.movie-of-the-week";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";

export async function action({ context, params, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = (await request.json()) as { isMovieOfTheWeek?: unknown };
  if (typeof body.isMovieOfTheWeek !== "boolean") return Response.json({ success: false, error: "isMovieOfTheWeek must be a boolean" }, { status: 400 });
  const result = await services.db.adminContent.setMovieOfTheWeek(params.id, body.isMovieOfTheWeek);
  if (result.status === "movie-missing") return Response.json({ success: false, error: "Movie not found" }, { status: 404 });
  return Response.json({ success: true, message: `Movie ${body.isMovieOfTheWeek ? "set as" : "removed from"} movie of the week` });
}
