
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { Badge } from "../ui/badge";
import { useReviews } from "@/lib/hooks/use-content";
import { Skeleton } from "@/components/ui/skeleton";
export default function Reviews() {
    const { data: reviews, isLoading, error } = useReviews();

    if (isLoading) {
        return (
            <section id="reviews" className="w-full">
                <h1 className="pb-3 border-b border-black text-2xl font-semibold">Reviews</h1>
                <div className="grid lg:grid-cols-4 md:grid-cols-2 lg:py-10 py-6 lg:gap-4 gap-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index} className="rounded-sm shadow-none p-0 gap-4 border-none">
                            <CardHeader className="p-0 relative z-10 rounded-t-sm">
                                <Skeleton className="w-full aspect-video rounded-sm relative z-10" />
                            </CardHeader>
                            <CardContent className="p-0 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-12 w-full" />
                            </CardContent>
                            <CardFooter className="p-0 flex justify-between border-t items-start">
                                <Skeleton className="h-6 w-16" />
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section id="reviews" className="w-full">
                <h1 className="pb-3 border-b border-black text-2xl font-semibold">Reviews</h1>
                <div className="py-6 text-center">
                    <p className="text-red-500">Failed to load reviews</p>
                </div>
            </section>
        );
    }

    return <section id="reviews" className="w-full">
        <h1 className="pb-3 border-b border-black text-2xl font-semibold">Reviews</h1>

        {reviews && reviews.length > 0 ? (
            <div className="grid lg:grid-cols-4 md:grid-cols-2 lg:py-10 py-6 lg:gap-4 gap-6">
                {reviews.map((review, index) => (
                    <Link key={index} href={review.externalUrl || `/reviews/${review.id}`} target={review.externalUrl ? "_blank" : undefined}>
                        <Card className="rounded-sm shadow-none p-0 gap-4 border-none">
                            <CardHeader className="p-0 relative z-10 rounded-t-sm">
                                <CldImage 
                                    src={review.reviewImage || "nollywood-film-club/elj"} 
                                    alt={`${review.title} Review`} 
                                    width={400} 
                                    height={400} 
                                    className="w-full aspect-video object-cover rounded-sm relative z-10"
                                    quality="auto"
                                    format="auto"
                                />
                            </CardHeader>

                            <CardContent className="p-0 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <CardTitle className="lg:text-lg font-semibold flex items-center gap-2 flex-wrap">
                                    {review.title} 
                                    <Badge className="text-xs text-black bg-transparent border border-black">Review</Badge>
                                </CardTitle>
                                <span className="text-black/40 text-xs">{review.reviewer}</span>

                                <CardDescription className="text-xs font-light">{review.description}</CardDescription>
                            </CardContent>

                            <CardFooter className="p-0 flex justify-between border-t items-start">
                                {review.score && (
                                    <Badge className="text-xs text-black bg-transparent border border-black">{review.score}</Badge>
                                )}
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        ) : (
            <div className="lg:py-10 py-6">
                <div className="grid lg:grid-cols-4 md:grid-cols-2 lg:gap-4 gap-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="rounded-sm shadow-none p-0 gap-4 flex flex-col">
                            <div className="p-0 relative z-10 rounded-t-sm">
                                <div className="w-full aspect-video bg-gray-200 rounded-sm relative z-10 flex items-center justify-center">
                                    <div className="text-4xl">📝</div>
                                </div>
                            </div>
                            <div className="p-0 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-12 bg-gray-200 rounded w-full"></div>
                            </div>
                            <div className="pt-1 flex justify-between border-t items-start">
                                <div className="h-6 bg-gray-200 rounded w-10"></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-8">
                    <h2 className="text-xl font-semibold mb-2">Coming Soon...</h2>
                    <p className="text-gray-600 text-sm">
                        Reviews will appear here once we start publishing them.
                    </p>
                </div>
            </div>
        )}
    </section>
}