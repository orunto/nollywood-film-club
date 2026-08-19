import type { Route } from "./+types/api.user.comments";
import { appServicesContext } from "../context";
import { getReviewThread } from "../../services/review-thread";
import { MAX_COMMENT_LENGTH_STORED } from "../../lib/comments";

// Reads and writes comments on reviews.

// Returns a review's comment thread (public, same data the permalink renders).
// Lets the comment sheet load a thread client-side without a page navigation.
// Query: ?reviewId=
export async function loader({ request, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);

  const url = new URL(request.url);
  const reviewId = url.searchParams.get("reviewId");
  if (!reviewId) {
    return Response.json({ success: false, error: "A reviewId is required" }, { status: 400 });
  }

  const thread = await getReviewThread(services.db.publicReads, reviewId);
  return Response.json({ success: true, data: thread });
}

// Posts a comment on a review, or a reply to an existing comment.
// Body: { reviewId, parentId?, body }
export async function action({ request, context }: Route.ActionArgs) {
  const services = context.get(appServicesContext);

  try {
    const session = await services.auth.getSession(request);
    if (!session) {
      return Response.json({ success: false, error: "Sign in first." }, { status: 401 });
    }

    const { reviewId, parentId, body } = (await request.json()) as {
      reviewId?: unknown;
      parentId?: unknown;
      body?: unknown;
    };

    const text = typeof body === "string" ? body.trim() : "";
    if (typeof reviewId !== "string" || !reviewId) {
      return Response.json(
        { success: false, error: "A reviewId is required" },
        { status: 400 },
      );
    }
    if (!text) {
      return Response.json({ success: false, error: "Comment cannot be empty" }, { status: 400 });
    }
    if (text.length > MAX_COMMENT_LENGTH_STORED) {
      return Response.json({ success: false, error: "Comment is too long" }, { status: 400 });
    }

    const result = await services.db.writes.addComment({
      reviewId,
      userId: session.userId,
      parentId: typeof parentId === "string" && parentId ? parentId : null,
      body: text,
    });

    switch (result.status) {
      case "created":
        return Response.json({ success: true, message: "Comment posted" });
      case "review-missing":
        return Response.json({ success: false, error: "Review not found" }, { status: 404 });
      case "review-restricted":
        return Response.json(
          { success: false, error: "That review is no longer available" },
          { status: 404 },
        );
      case "parent-missing":
        return Response.json(
          { success: false, error: "That comment no longer exists" },
          { status: 404 },
        );
      case "parent-wrong-review":
        return Response.json(
          { success: false, error: "That comment belongs to a different review" },
          { status: 400 },
        );
      case "parent-restricted":
        return Response.json(
          { success: false, error: "That comment is no longer available" },
          { status: 400 },
        );
      case "too-deep":
        return Response.json(
          {
            success: false,
            error: "This thread has gone deep enough. Take it to the Space.",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error posting comment:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}