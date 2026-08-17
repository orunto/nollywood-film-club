import type { Route } from "./+types/api.movie-of-the-week";
import { appServicesContext } from "../context";

export async function loader({ context }: Route.LoaderArgs) {
  const content = await context.get(appServicesContext).db.publicReads.getMovieOfTheWeek();
  return Response.json({ success: true, data: content });
}
