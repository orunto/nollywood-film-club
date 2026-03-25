'use client'

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Nav, Footer } from '@/components/custom';
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserRating } from '@/lib/server-queries';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<UserRating[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { ref, inView } = useInView();

  const fetchReviews = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews?page=${page}&limit=12`);
      const result = await response.json();
      if (result.success) {
        setReviews(prev => [...prev, ...result.data]);
        setHasMore(result.hasMore);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inView) {
      fetchReviews();
    }
  }, [inView]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-grow lg:px-10 lg:py-8 py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <header className="mb-10 border-b border-black pb-6">
            <h1 className="text-4xl font-black uppercase tracking-tighter">Community Reviews</h1>
            <p className="text-black/60 mt-2 font-medium">What the NFC community is saying about Nollywood.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review, index) => (
              <Link key={index} href={`/movies/${review.contentId}#review-${review.id}`} className="block h-full">
                <Card className="h-full rounded-sm shadow-none p-6 border border-black/10 flex flex-col gap-6 bg-white hover:border-black transition-all group">
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
                    <span className="font-black text-xl leading-tight uppercase tracking-tight line-clamp-2">{review.contentTitle}</span>
                  </div>

                  <blockquote className="text-base font-medium text-black/80 leading-relaxed italic relative flex-grow">
                    <span className="text-4xl absolute -top-4 -left-2 text-black/5 font-serif">"</span>
                    {review.review}
                    <span className="text-4xl absolute -bottom-8 -right-2 text-black/5 font-serif">"</span>
                  </blockquote>
                </Card>
              </Link>
            ))}
          </div>

          <div ref={ref} className="w-full flex justify-center py-10">
            {loading && <Loader2 className="w-8 h-8 animate-spin text-black" />}
            {!hasMore && reviews.length > 0 && <p className="text-black/40 font-medium italic">You've reached the end of community reviews.</p>}
            {!loading && reviews.length === 0 && !hasMore && <p className="text-black/40 font-medium">No reviews found.</p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
