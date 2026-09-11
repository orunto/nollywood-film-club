import type { Route } from "./+types/api.content.$id.ratings";
import { appServicesContext } from "../context";

function pageSize(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : 50;
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const limit = pageSize(url.searchParams.get("limit"));
  const data = await context.get(appServicesContext).db.publicReads.getUserRatingsForContent(
    params.id,
    { limit, cursor: url.searchParams.get("cursor") ?? undefined },
  );
  const nextCursor = data.length === limit ? data.at(-1)?.id ?? null : null;
  return Response.json({ success: true, data, nextCursor });
}
