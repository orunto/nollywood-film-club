import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/custom";
import ReviewCard from "@/components/custom/review-card";
import { EmptyReviewsIllustration } from "@/components/graphics";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { countTrendingReviews, getTrendingReviews } from "@/lib/server-queries";

export const metadata: Metadata = {
  title: "Reviews | Nollywood Film Club",
  description:
    "What the club actually thinks, ranked by how much argument it started. Members review, members push back, nobody agrees.",
};

const PAGE_SIZE = 12;

export default async function ReviewsFeedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const parsed = parseInt(rawPage ?? "", 10);
  const requested = Number.isNaN(parsed) ? 1 : Math.max(parsed, 1);

  const total = await countTrendingReviews();
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const page = Math.min(requested, totalPages);

  const reviews = await getTrendingReviews({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const pageHref = (target: number) => (target <= 1 ? "/reviews" : `/reviews?page=${target}`);

  return (
    <>
      <main className="min-h-screen">
        <div className="flex min-h-screen w-full flex-col px-6 py-10 lg:px-10 lg:py-8">
          <section className="w-full">
            <div className="flex items-baseline justify-between gap-4 border-b border-black">
              <h1 className="pb-3 text-2xl font-semibold">Reviews</h1>
              <span className="pb-3 text-sm text-black/60">
                {total} {total === 1 ? "take" : "takes"}
              </span>
            </div>

            <p className="pt-4 text-sm font-light text-black/60">
              Trending means whatever started the most pushback lately. Not whatever was right.
            </p>

            {reviews.length > 0 ? (
              <>
                <div className="grid gap-6 py-6 lg:grid-cols-2">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination className="pb-10">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={pageHref(page - 1)}
                          aria-disabled={page === 1}
                          className={page === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink href={pageHref(p)} isActive={p === page}>
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href={pageHref(page + 1)}
                          aria-disabled={page === totalPages}
                          className={
                            page === totalPages ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <EmptyReviewsIllustration className="w-40" />
                <h2 className="text-xl font-semibold">Nobody has said anything yet</h2>
                <p className="max-w-md text-sm font-light text-black/60">
                  Rate something and write it down. The opinion is only real once it is
                  on the record and somebody can argue with it.
                </p>
                <Link
                  href="/movies-and-tv"
                  className="rounded-sm bg-black px-4 py-2 text-sm text-white hover:bg-black/80"
                >
                  Find something to review
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
