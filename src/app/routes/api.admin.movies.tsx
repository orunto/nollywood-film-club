import type { Route } from "./+types/api.admin.movies";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import type { ContentInput } from "../../repositories/admin-content";
import { RATINGS, STREAMING_PLATFORMS, VIEWING_CATEGORIES } from "../../db/schema";
import { generateContentOpenGraphImage } from "../../services/content-og-write";

export async function loader({ context, request }: Route.LoaderArgs) { const services = context.get(appServicesContext); const authorization = await requireAdmin(services, request); if (authorization instanceof Response) return authorization; return Response.json({ success: true, data: await services.db.adminContent.list() }); }
export async function action({ context, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const row = await services.db.adminContent.create(parseContent(await request.json()));
  const warning = await generateContentOpenGraphImage(services, row);
  return Response.json(
    { success: true, data: row, message: "Movie created successfully", warning },
    { status: 201 },
  );
}
export function parseContent(body: Record<string, unknown>): ContentInput { if (typeof body.title !== "string" || !body.title) throw new Error("Title is required and must be a string"); if (body.contentType !== "movie" && body.contentType !== "tv_show" && body.contentType !== "short_film") throw new Error("Content type must be one of movie, tv_show, or short_film"); const rating = RATINGS.includes(body.rating as never) ? body.rating as ContentInput["rating"] : null; const streamingPlatform = STREAMING_PLATFORMS.includes(body.streamingPlatform as never) ? body.streamingPlatform as ContentInput["streamingPlatform"] : null; const viewingCategory = VIEWING_CATEGORIES.includes(body.viewingCategory as never) ? body.viewingCategory as ContentInput["viewingCategory"] : null; return { title: body.title, contentType: body.contentType, runtime: typeof body.runtime === "number" ? body.runtime : null, releaseDate: typeof body.releaseDate === "string" ? body.releaseDate : null, rating, synopsis: typeof body.synopsis === "string" ? body.synopsis : null, genre: Array.isArray(body.genre) ? body.genre.filter((v): v is string => typeof v === "string") : [], posterImage: typeof body.posterImage === "string" ? body.posterImage : null, posterVersion: typeof body.posterVersion === "number" ? body.posterVersion : null, trailerUrl: typeof body.trailerUrl === "string" ? body.trailerUrl : null, streamingUrl: typeof body.streamingUrl === "string" ? body.streamingUrl : null, streamingPlatform, otherPlatform: typeof body.otherPlatform === "string" ? body.otherPlatform : null, viewingCategory, castMembers: body.castMembers ?? null, isMovieOfTheWeek: body.isMovieOfTheWeek === true }; }
