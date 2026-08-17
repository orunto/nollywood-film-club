import type { Route } from "./+types/api.admin.discussions";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import type { DiscussionInput } from "../../repositories/admin-discussions";

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  return Response.json({ success: true, data: await services.db.adminDiscussions.list() });
}

export async function action({ context, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = (await request.json()) as Record<string, unknown>;
  if (typeof body.title !== "string" || !body.title) return Response.json({ success: false, error: "Title is required and must be a string" }, { status: 400 });
  const discussion = await services.db.adminDiscussions.create(parseDiscussion(body));
  return Response.json({ success: true, data: discussion, message: "Discussion created successfully" }, { status: 201 });
}

export function parseDiscussion(body: Record<string, unknown>): DiscussionInput {
  return {
    title: body.title as string,
    description: typeof body.description === "string" ? body.description : null,
    contentId: typeof body.contentId === "string" ? body.contentId : null,
    spaceUrl: typeof body.spaceUrl === "string" ? body.spaceUrl : null,
    podcastLinks: Array.isArray(body.podcastLinks) ? body.podcastLinks.filter((value): value is string => typeof value === "string") : [],
    episodeNumber: typeof body.episodeNumber === "number" ? body.episodeNumber : null,
    discussionDate: typeof body.discussionDate === "string" ? body.discussionDate : null,
  };
}
