import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { Footer, Nav } from "@/components/custom";
import ReviewCard from "@/components/custom/review-card";
import PushbackThread from "@/components/custom/pushback-thread";
import { getFeedReviewById, getReviewThread } from "@/lib/server-queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const review = await getFeedReviewById(id);
  if (!review) return { title: "Review | Nollywood Film Club" };

  const film = review.film?.title ?? "a film";
  return {
    title: `${review.username} on ${film} | Nollywood Film Club`,
    description: review.review?.slice(0, 160) ?? undefined,
  };
}

export default async function ReviewPermalinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // getFeedReviewById returns null for restricted reviews too, so a moderated
  // take 404s here rather than staying reachable by direct link.
  const review = await getFeedReviewById(id);
  if (!review) notFound();

  const thread = await getReviewThread(id);

  return (
    <>
      <Nav />
      <main className="min-h-screen">
        <div className="w-full bg-black text-white">
          <div className="flex items-center justify-between gap-4 px-6 py-3 lg:px-10">
            <Link
              href="/reviews"
              className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              All reviews
            </Link>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 lg:px-10">
          <ReviewCard review={review} expanded />
          <PushbackThread reviewId={review.id} thread={thread} />
        </div>
      </main>
      <Footer />
    </>
  );
}
