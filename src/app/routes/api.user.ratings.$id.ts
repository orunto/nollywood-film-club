import type { Route } from "./+types/api.user.ratings.$id";
import { appServicesContext } from "../context";
import { REVIEW_MAX, REVIEW_MAX_STORED } from "../../lib/reviews";

// Updates or deletes one of the caller's own ratings by id.

export async function action({ request, context, params }: Route.ActionArgs) {
  const services = context.get(appServicesContext);

  try {
    const session = await services.auth.getSession(request);
    if (!session) {
      return Response.json({ success: false, error: "Sign in first." }, { status: 401 });
    }

    const id = params.id;

    // DELETE — the dashboard's remove rating. Replies aren't involved.
    if (request.method === "DELETE") {
      const deleted = await services.db.writes.deleteRating(id, session.userId);
      if (!deleted) {
        return Response.json(
          { success: false, error: "Rating not found or access denied" },
          { status: 404 },
        );
      }
      return Response.json({ success: true, message: "Rating deleted successfully" });
    }

    // PUT — update the review (and optionally rating) on an existing rating.
    const ratingData = (await request.json()) as {
      rating?: unknown;
      review?: unknown;
    };
    if (!ratingData || typeof ratingData !== "object") {
      return Response.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    if (
      typeof ratingData.review === "string" &&
      ratingData.review.length > REVIEW_MAX_STORED
    ) {
      return Response.json(
        { success: false, error: `Review must be ${REVIEW_MAX} characters or fewer` },
        { status: 400 },
      );
    }

    const reviewValue =
      typeof ratingData.review === "string" && ratingData.review.trim() !== ""
        ? ratingData.review
        : null;

    const numericRating =
      typeof ratingData.rating === "number"
        ? ratingData.rating
        : typeof ratingData.rating === "string"
          ? Number(ratingData.rating)
          : NaN;
    if (Number.isNaN(numericRating)) {
      return Response.json(
        { success: false, error: "Rating is required and must be a number" },
        { status: 400 },
      );
    }

    const updated = await services.db.writes.updateRating(id, session.userId, {
      rating: numericRating,
      review: reviewValue,
    });
    if (!updated) {
      return Response.json(
        { success: false, error: "Rating not found or access denied" },
        { status: 404 },
      );
    }

    return Response.json({ success: true, message: "Rating updated successfully" });
  } catch (error) {
    console.error("Error updating rating:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}