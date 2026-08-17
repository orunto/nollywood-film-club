import type { Route } from "./+types/api.user.ratings";
import { appServicesContext } from "../context";
import { REVIEW_MAX, REVIEW_MAX_STORED } from "../../lib/reviews";

// Reads and writes the caller's own ratings.

// ?contentId= returns the caller's single rating for that title (or null) so
// the rating sheet can preload into edit mode. Without it, returns every
// rating the caller has made, newest first.
export async function loader({ request, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);

  try {
    const session = await services.auth.getSession(request);
    if (!session) {
      return Response.json({ success: false, error: "Sign in first." }, { status: 401 });
    }

    const url = new URL(request.url);
    const contentId = url.searchParams.get("contentId");

    if (contentId) {
      const rating = await services.db.publicReads.getUserRating(contentId, session.userId);
      return Response.json({ success: true, data: rating ?? null });
    }

    const ratings = await services.db.publicReads.getRatingsByUser(session.userId, { limit: 500 });
    return Response.json({ success: true, data: ratings });
  } catch (error) {
    console.error("Error fetching user ratings:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

// Submits (or updates) the caller's rating of a title.
// Body: { contentId, rating, review? }
export async function action({ request, context }: Route.ActionArgs) {
  const services = context.get(appServicesContext);

  try {
    const session = await services.auth.getSession(request);
    if (!session) {
      return Response.json({ success: false, error: "Sign in first." }, { status: 401 });
    }

    const ratingData = await request.json();
    if (!ratingData || typeof ratingData !== "object") {
      return Response.json({ success: false, error: "Invalid request body" }, { status: 400 });
    }

    const { contentId, rating, review } = ratingData as {
      contentId?: unknown;
      rating?: unknown;
      review?: unknown;
    };

    if (typeof contentId !== "string" || !contentId) {
      return Response.json({ success: false, error: "Content ID is required" }, { status: 400 });
    }

    const numericRating =
      typeof rating === "number"
        ? rating
        : typeof rating === "string"
          ? Number(rating)
          : NaN;
    if (Number.isNaN(numericRating) || numericRating === null || numericRating === undefined) {
      return Response.json(
        { success: false, error: "Rating is required and must be a number" },
        { status: 400 },
      );
    }

    if (typeof review === "string" && review.length > REVIEW_MAX_STORED) {
      return Response.json(
        { success: false, error: `Review must be ${REVIEW_MAX} characters or fewer` },
        { status: 400 },
      );
    }

    // Empty/whitespace review means "no review" — stored as null. The sheet
    // preloads the existing review before submitting, so an empty string here
    // is an intentional clear, not an accidental overwrite.
    const reviewValue =
      typeof review === "string" && review.trim() !== "" ? review : null;

    const result = await services.db.writes.upsertRating({
      contentId,
      userId: session.userId,
      rating: numericRating,
      review: reviewValue,
    });

    return Response.json({
      success: true,
      message: result.status === "updated" ? "Rating updated!" : "Rating submitted!",
    });
  } catch (error) {
    console.error("Error creating rating:", error);
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}