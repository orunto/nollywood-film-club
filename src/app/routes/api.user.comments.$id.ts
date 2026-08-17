import type { Route } from "./+types/api.user.comments.$id";
import { appServicesContext } from "../context";

// Deletes one of the caller's own comments. Replies hanging off it go too, via
// the ON DELETE CASCADE on comments.parent_id.

export async function action({ request, context, params }: Route.ActionArgs) {
  const services = context.get(appServicesContext);

  try {
    const session = await services.auth.getSession(request);
    if (!session) {
      return Response.json({ success: false, error: "Sign in first." }, { status: 401 });
    }

    if (request.method !== "DELETE") {
      return Response.json(
        { success: false, error: "Method not allowed" },
        { status: 405 },
      );
    }

    const id = params.id;
    const deleted = await services.db.writes.deleteComment(id, session.userId);
    if (!deleted) {
      return Response.json(
        { success: false, error: "Comment not found or access denied" },
        { status: 404 },
      );
    }

    return Response.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}