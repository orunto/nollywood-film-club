'use client'

import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { UserRating } from "@/lib/server-queries";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Image from "next/image";

interface ReviewsProps {
    reviews: UserRating[];
}

export default function Reviews({ reviews }: ReviewsProps) {
    return <section id="reviews" className="w-full">
        <div className="flex justify-between items-center w-full border-b border-black">
            <h1 className="pb-3 border-black text-2xl font-semibold">Community Reviews</h1>
            <Link href="/reviews" className="underline text-sm hover:">View All</Link>
        </div>

        <div className="w-full relative">
            <div className="flex overflow-x-auto lg:py-10 py-6 gap-6 scrollbar-hide snap-x snap-mandatory no-scrollbar">
                {reviews && reviews.length > 0 ? (
                    <>
                        {reviews.map((review, index) => (
                            <Link key={index} href={`/movies/${review.contentId}#review-${review.id}`} className="snap-start">
                                <Card className="min-w-[300px] md:min-w-[400px] max-w-[400px] h-full rounded-sm shadow-none p-6 border border-black/10 flex flex-col gap-6 bg-white hover:border-black transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            {review.profileImage ? (
                                                <Image
                                                    src={review.profileImage}
                                                    alt=""
                                                    width={48}
                                                    height={48}
                                                    className="rounded-full aspect-square object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                                                    {(review.username || review.userId).charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm">{review.username}</span>
                                                <span className="text-xs text-black/40">
                                                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    }) : 'Recently'}
                                                </span>
                                            </div>
                                        </div>
                                        {review.rating !== null && (
                                            <Badge className={`text-base font-bold rounded-sm h-10 w-10 flex items-center justify-center p-0 border-none ${Number(review.rating) >= 7 ? 'bg-green-600' : (Number(review.rating) >= 5 ? 'bg-amber-500' : 'bg-red-600')} text-white`}>
                                                {review.rating}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">Review for</span>
                                        <span className="font-black text-xl leading-tight uppercase tracking-tight">{review.contentTitle}</span>
                                    </div>

                                    <blockquote className="text-base font-medium text-black/80 leading-relaxed italic relative">
                                        <span className="text-4xl absolute -top-4 -left-2 text-black/5 font-serif">"</span>
                                        <p className="line-clamp-4">{review.review}</p>
                                        <span className="text-4xl absolute -bottom-8 -right-2 text-black/5 font-serif">"</span>
                                    </blockquote>
                                </Card>
                            </Link>
                        ))}
                        
                        {/* View All Card at the end */}
                        <Link href="/reviews" className="snap-start h-full">
                            <Card className="min-w-[200px] h-full rounded-sm shadow-none p-6 border border-black/10 flex flex-col items-center justify-center gap-4 bg-primary/5 hover:bg-primary/10 hover:border-black transition-all group">
                                <div className="h-12 w-12 rounded-full border border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                                    <ArrowRight className="w-6 h-6" />
                                </div>
                                <span className="font-bold uppercase tracking-widest text-sm">View All Reviews</span>
                            </Card>
                        </Link>
                    </>
                ) : (
                    <div className="flex gap-6 w-full">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Card key={index} className="min-w-[300px] md:min-w-[400px] rounded-sm shadow-none p-6 border border-black/10 snap-start flex flex-col gap-6 opacity-40 bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                                    <div className="flex flex-col gap-2">
                                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="h-2 bg-gray-200 rounded w-16"></div>
                                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
            
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    </section>
}
