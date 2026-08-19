import type { Route } from "./+types/api.movies-and-tv-series";
import { appServicesContext } from "../context";

export async function loader({ context, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100);
  const data = await context.get(appServicesContext).db.publicReads.getMoviesAndTVSeries(limit);
  return Response.json({ success: true, data });
}
