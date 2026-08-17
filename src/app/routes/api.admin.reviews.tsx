import type { Route } from "./+types/api.admin.reviews";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import type { ReviewInput } from "../../repositories/admin-reviews";

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  return Response.json({ success: true, data: await services.db.adminReviews.list() });
}

export async function action({ context, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  try {
    const review = await services.db.adminReviews.create(parseReview(await request.json()));
    return Response.json({ success: true, data: review, message: "Review created successfully" }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Invalid review" }, { status: 400 });
  }
}

export function parseReview(value: unknown): ReviewInput {
  const body = value as Record<string, unknown>;
  if (typeof body.contentId !== "string" || typeof body.title !== "string" || typeof body.description !== "string" || typeof body.reviewer !== "string") throw new Error("contentId, title, description, and reviewer are required");
  if (body.score !== null && body.score !== undefined && typeof body.score !== "number") throw new Error("score must be a number or null");
  return {
    contentId: body.contentId,
    title: body.title,
    description: body.description,
    score: (body.score as number | null | undefined) ?? null,
    reviewer: body.reviewer,
    externalUrl: typeof body.externalUrl === "string" ? body.externalUrl : null,
    reviewImage: typeof body.reviewImage === "string" ? body.reviewImage : null,
    publishedAt: typeof body.publishedAt === "string" ? body.publishedAt : null,
  };
}
