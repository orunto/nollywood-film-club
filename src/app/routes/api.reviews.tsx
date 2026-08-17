import type { Route } from "./+types/api.reviews";
import { appServicesContext } from "../context";

export async function loader({ context, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const contentId = url.searchParams.get("contentId");
  const data = contentId
    ? await context.get(appServicesContext).db.publicReads.getCriticReviewsForContent(contentId)
    : await context.get(appServicesContext).db.publicReads.getTrendingReviews();
  return Response.json({ success: true, data });
}
