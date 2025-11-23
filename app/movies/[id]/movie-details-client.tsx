"use client";
import MovieHero from "@/components/sections/movie-hero";
import { Content, UserRating } from "@/lib/server-queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Star } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
interface MovieDetailsClientProps {
  movie: Content | null;
  userRatings: UserRating[];
}

export default function MovieDetailsClient({
  movie,
  userRatings,
}: MovieDetailsClientProps) {
  const router = useRouter();
  if (!movie) {
    return (
      <div className="min-h-screen w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 gap-15">
        <section className="w-full">
          <h1 className="pb-3 border-b border-black text-2xl font-semibold">
            Movie Details
          </h1>
          <div className="py-6 text-center">
            <p className="text-gray-500">Movie not found</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 gap-6 min-h-screen">
      <Button onClick={() => router.back()} className="w-max bg-white text-black">
          <ArrowLeft className="h-4 w-4" />
          Go Back
      </Button>
      {/* Movie Header Section (using MovieHero) */}
      <MovieHero movie={movie} showRating={false} />

      {/* User Ratings/Comments Section */}
      <section className="w-full mt-10">
        <h2 className="pb-3 border-b border-black text-2xl font-semibold">
          User Reviews {userRatings.length > 0 && `(${userRatings.length})`}
        </h2>
        <div className="py-6">
          {userRatings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No reviews yet. Be the first to review this movie!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {userRatings.map((userRating) => (
                <Card className="shadow-none rounded-sm gap-2 bg-gray-50" key={userRating.id}>
                  <CardHeader>
                    <p className="text-gray-500 mb-4 text-xs">
                      {new Date(
                        userRating.createdAt,
                      ).toLocaleDateString()}
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {userRating.profileImage ? (
                          <Image
                            src={userRating.profileImage}
                            alt=""
                            width={50}
                            height={50}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                            {userRating.userId.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">
                            {userRating.username || `User ${userRating.userId}`}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {/*{[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < (userRating.rating || 0) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                          />
                        ))}*/}
                        <span className="text-xs text-gray-500">
                          {userRating.rating === 10 &&`I liked it!`}
                          {userRating.rating === 5 && `It was okay`}
                          {userRating.rating === 0 && `I didn't like it`}
                        </span>
                        
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {userRating.review && (
                      <p className="text-gray-700 text-sm">{userRating.review}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
