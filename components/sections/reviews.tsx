import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import ReviewCard from "@/components/custom/review-card";
import { FeedReview } from "@/lib/server-queries";

interface ReviewsProps {
    // Trending member reviews — the busiest recent takes, not critic writeups
    reviews: FeedReview[];
}

export default function Reviews({ reviews }: ReviewsProps) {
    return <section id="reviews" className="w-full">
        <div className="flex items-baseline justify-between gap-4 border-b border-black">
            <h1 className="pb-3 text-2xl font-semibold">Reviews</h1>
            {reviews && reviews.length > 0 && (
                <Link
                    href="/reviews"
                    className="flex items-center gap-1.5 pb-3 text-sm text-black/60 hover:text-black"
                >
                    All of it
                    <ArrowRightIcon className="h-4 w-4" />
                </Link>
            )}
        </div>

        {reviews && reviews.length > 0 ? (
            <div className="grid gap-6 py-6 lg:grid-cols-2 lg:py-10">
                {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                ))}
            </div>
        ) : (
            <div className="lg:py-10 py-6">
                <div className="grid gap-6 lg:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className={`${index >= 1 ? 'hidden md:block' : ''}`}>
                            <div className="flex flex-col gap-4 rounded-sm bg-black/5 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-16 w-11 rounded-sm bg-gray-200" />
                                    <div className="flex flex-col gap-2">
                                        <div className="h-5 w-40 rounded bg-gray-200" />
                                        <div className="h-4 w-16 rounded bg-gray-200" />
                                    </div>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-gray-200" />
                                <div className="h-12 w-full rounded bg-gray-200" />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-8">
                    <h2 className="text-xl font-semibold mb-2">Nobody has said anything yet</h2>
                    <p className="text-gray-600 text-sm">
                        The yapping is already recorded. Writing it down is the hard part.
                        Rate something and put it on the record.
                    </p>
                </div>
            </div>
        )}
    </section>
}
