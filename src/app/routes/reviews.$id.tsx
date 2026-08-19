import type { Route } from "./+types/reviews.$id";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { appServicesContext } from "../context";
import Footer from "../../components/site/footer";
import ReviewCard from "../../components/custom/review-card";
import CommentThread from "../../components/custom/comment-thread";
import { getReviewPermalinkData } from "../../services/review-thread";
import { markdownToPlainText } from "../../lib/utils";

export const meta: Route.MetaFunction = ({ matches }) => {
  let self: { loaderData?: Route.ComponentProps["loaderData"] } | undefined;
  for (const m of matches) {
    if (m && m.id === "routes/reviews.$id") {
      self = m as unknown as { loaderData?: Route.ComponentProps["loaderData"] };
      break;
    }
  }
  const data = self?.loaderData;
  if (!data) return [{ title: "Review | Nollywood Film Club" }];
  const film = data.review.film?.title ?? "a film";
  return [
    { title: `${data.review.username} on ${film} | Nollywood Film Club` },
    ...(data.review.review
      ? [{ name: "description", content: markdownToPlainText(data.review.review).slice(0, 160) }]
      : []),
  ];
};

export async function loader({ params, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const id = params.id ?? "";

  // getReviewPermalinkData returns null for restricted reviews too, so a
  // moderated take 404s here rather than staying reachable by direct link.
  const data = await getReviewPermalinkData(services.db.publicReads, id);
  if (!data) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return data;
}

export default function ReviewPermalinkPage() {
  const data = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  return (
    <>
      <main className="min-h-screen">
        <div className="w-full bg-black text-white">
          <div className="flex items-center justify-between gap-4 px-6 py-3 lg:px-10">
            <Link
              to="/reviews"
              className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              All reviews
            </Link>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
          <ReviewCard review={data.review} expanded className="border-b border-black/10 pb-8" />
          <CommentThread
            reviewId={data.review.id}
            thread={data.thread}
            onPosted={revalidate}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}