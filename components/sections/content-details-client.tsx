"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CldImage } from "next-cloudinary";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BroadcastIcon,
  MicrophoneIcon,
  MicrophoneStageIcon,
  PlayIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react";
import { EmptyReviewsIllustration } from "@/components/graphics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ContentCard from "@/components/custom/content-card";
import MovieRatingSheet from "@/components/custom/movie-rating-sheet";
import { STREAMING_PLATFORMS } from "@/components/sections/movie-hero";
import { Content, Review, UserRating } from "@/lib/server-queries";
import {
  cn,
  contentTypeLabel,
  getAverageRatingLabel,
  scoreBadgeClass,
  toYoutubeEmbedUrl,
} from "@/lib/utils";

interface ContentDetailsClientProps {
  movie: Content;
  userRatings: UserRating[];
  criticReviews: Review[];
  related: Content[];
  spaceUrl?: string | null;
  podcastLinks?: string[] | null;
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

const formatRuntime = (runtime: number | null) =>
  runtime ? `${Math.floor(runtime / 60)} h ${runtime % 60} m` : null;

// Positive / mixed / negative split of member ratings (10 / 5 / 0)
function ratingCounts(ratings: UserRating[]) {
  return {
    positive: ratings.filter((r) => r.rating === 10).length,
    mixed: ratings.filter((r) => r.rating === 5).length,
    negative: ratings.filter((r) => r.rating === 0).length,
  };
}

function DistributionBar({ ratings }: { ratings: UserRating[] }) {
  const { positive, mixed, negative } = ratingCounts(ratings);
  const total = positive + mixed + negative;

  if (total === 0) {
    return <div className="h-1.5 w-full rounded-full bg-black/10" />;
  }

  return (
    <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full">
      {positive > 0 && (
        <div className="bg-green-900 rounded-full" style={{ flexGrow: positive }} />
      )}
      {mixed > 0 && (
        <div className="bg-amber-500 rounded-full" style={{ flexGrow: mixed }} />
      )}
      {negative > 0 && (
        <div className="bg-red-700 rounded-full" style={{ flexGrow: negative }} />
      )}
    </div>
  );
}

function ScoreBox({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-sm font-semibold text-white",
        score === null ? "text-xs" : "text-2xl",
        scoreBadgeClass(score),
        className,
      )}
    >
      {score ?? "N/A"}
    </div>
  );
}

const USER_REVIEW_TABS = [
  { value: "all", label: "All" },
  { value: "10", label: "Liked" },
  { value: "5", label: "Okay" },
  { value: "0", label: "Disliked" },
] as const;

export default function ContentDetailsClient({
  movie,
  userRatings,
  criticReviews,
  related,
  spaceUrl,
  podcastLinks,
}: ContentDetailsClientProps) {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [reviewFilter, setReviewFilter] =
    useState<(typeof USER_REVIEW_TABS)[number]["value"]>("all");

  const actors = movie.castMembers?.filter((c) => c.role === "actor") ?? [];
  const directors = movie.castMembers?.filter((c) => c.role === "director") ?? [];

  const trailerEmbedUrl = movie.trailerUrl ? toYoutubeEmbedUrl(movie.trailerUrl) : null;
  const platform = movie.streamingPlatform
    ? STREAMING_PLATFORMS[movie.streamingPlatform]
    : null;

  const hasPodcastLink = Boolean(podcastLinks && podcastLinks.length > 0);
  const hasSpaceOrPodcast = Boolean(spaceUrl || hasPodcastLink);

  // A tab opened straight onto this page — a shared link, or "open in new tab"
  // from anywhere — has a single history entry, so router.back() would sit there
  // doing nothing. Send those visitors home instead.
  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  // Rating opens 24h after the title lands in the catalog, or as soon as the
  // podcast episode discussing it is out
  const isRatingEnabled =
    hasPodcastLink ||
    (Boolean(movie.createdAt) &&
      Date.now() - new Date(movie.createdAt).getTime() > 24 * 60 * 60 * 1000);

  const ratingsWithReview = userRatings.filter((r) => r.review);
  const visibleUserReviews =
    reviewFilter === "all"
      ? ratingsWithReview
      : ratingsWithReview.filter((r) => String(r.rating) === reviewFilter);

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getUTCFullYear()
    : null;
  const metaLine = [year, movie.rating, formatRuntime(movie.runtime)]
    .filter(Boolean)
    .map(String);

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Meta band — year / rating / runtime strip above the hero */}
      <div className="w-full bg-black text-white border-t border-white/15">
        <div className="flex items-center justify-between gap-4 lg:px-10 px-6 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Go Back
          </button>
          <div className="flex items-center gap-2 text-sm">
            {movie.isMovieOfTheWeek && (
              <Badge className="bg-white text-black rounded-sm mr-2">
                Movie of the Week
              </Badge>
            )}
            <span className="font-medium">
              {[contentTypeLabel(movie.contentType), ...metaLine].join(" • ")}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col lg:px-10 lg:py-8 py-8 px-6 gap-10">
        {/* Hero: trailer + score sidebar + summary */}
        <section className="grid lg:grid-cols-6 gap-6 lg:gap-10">
          <figure className="lg:col-span-4 aspect-video">
            <div
              className={`relative w-full h-full rounded-lg bg-black overflow-hidden group ${trailerEmbedUrl ? "cursor-pointer" : ""}`}
              onClick={trailerEmbedUrl ? () => setIsPlaying(true) : undefined}
            >
              {!isPlaying ? (
                <>
                  <CldImage
                    src={movie.posterImage || "nollywood-film-club/elj"}
                    version={movie.posterVersion ?? undefined}
                    alt={`${movie.title} Poster`}
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 group-hover:text-white lg:text-white/50 text-white transition-colors gap-4">
                    <span className="lg:text-lg text-base">
                      {trailerEmbedUrl ? "Watch Trailer" : "Trailer: N/A"}
                    </span>
                    {trailerEmbedUrl && (
                      <div className="bg-red-500/50 lg:text-white/50 rounded-full p-4 group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <PlayIcon className="w-8 h-8 ml-1" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <iframe
                  width="100%"
                  height="100%"
                  src={`${trailerEmbedUrl}?autoplay=1&rel=0&controls=1&modestbranding=1&showinfo=0&iv_load_policy=3&fs=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}
            </div>
          </figure>

          {/* Score sidebar */}
          <aside className="lg:col-span-2 lg:row-span-2 flex flex-col border border-black/15 rounded-sm h-max">
            <div className="p-5 pb-4">
              <h1 className="text-3xl font-bold flex items-start gap-3 flex-wrap">
                {movie.title}
              </h1>
              <div className="flex items-center gap-2 pt-3">
                <Badge className="text-xs text-black bg-transparent border border-black rounded-sm">
                  {contentTypeLabel(movie.contentType)}
                </Badge>
                {movie.rating && (
                  <Badge className="text-xs text-black bg-transparent border border-black rounded-sm">
                    {movie.rating}
                  </Badge>
                )}
              </div>
            </div>

            {/* NFC score */}
            <div className="border-t border-black/10 p-5 flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-[0.2em] text-black/60">
                NFC SCORE
              </span>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {getAverageRatingLabel(movie.userRating ?? 0)}
                  </span>
                  <span className="text-sm text-black/60 underline underline-offset-2">
                    Based on {userRatings.length}{" "}
                    {userRatings.length === 1 ? "member rating" : "member ratings"}
                  </span>
                </div>
                <ScoreBox score={movie.userRating} className="h-16 w-16 shrink-0" />
              </div>
              <DistributionBar ratings={userRatings} />
            </div>

            {/* My score */}
            <div className="border-t border-black/10 p-5 flex flex-col gap-3">
              <span className="text-xs font-semibold tracking-[0.2em] text-black/60">
                MY SCORE
              </span>
              <span className="text-sm text-black/60">
                {isRatingEnabled
                  ? "Watched it? Tell the club what you thought."
                  : "Rating opens after we discuss it on the space."}
              </span>
              <MovieRatingSheet
                movieId={movie.id}
                movieTitle={movie.title}
                isRatingEnabled={isRatingEnabled}
                onRatingSubmit={() => router.refresh()}
              />
            </div>

            {/* Where to watch */}
            <div className="border-t border-black/10 p-5 flex flex-col gap-3">
              <span className="text-lg font-semibold">Where to Watch</span>
              {movie.streamingUrl ? (
                <Link target="_blank" href={movie.streamingUrl}>
                  <Button
                    variant="secondary"
                    className={cn("w-full py-4 max-h-13 flex gap-0", platform?.className)}
                  >
                    Stream on
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {platform ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={platform.logo} alt={`${platform.label} logo`} />
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          {movie.otherPlatform || "Platform"}
                        </>
                      )}
                    </span>
                  </Button>
                </Link>
              ) : (
                <span className="text-sm text-black/60">
                  Not streaming anywhere yet.
                </span>
              )}
              {hasSpaceOrPodcast && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full py-4 bg-black text-white">
                      <MicrophoneIcon className="w-4 h-4" />
                      Listen to Space
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Listen to {movie.title}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Choose your preferred platform to listen to the recording of
                        this discussion.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col gap-2 py-4">
                      {spaceUrl && (
                        <a
                          href={spaceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 border rounded-sm hover:bg-black/5 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <MicrophoneStageIcon className="w-5 h-5" />
                            <span className="font-medium">Twitter Space Link</span>
                          </div>
                          <ArrowSquareOutIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                      {podcastLinks?.map((link, idx) => {
                        const isSpotify = link.includes("spotify");
                        const isYoutube = link.includes("youtube");

                        return (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 border rounded-sm hover:bg-black/5 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              {isSpotify ? (
                                <BroadcastIcon className="w-5 h-5 text-[#1DB954]" />
                              ) : isYoutube ? (
                                <YoutubeLogoIcon className="w-5 h-5 text-[#FF0000]" />
                              ) : (
                                <BroadcastIcon className="w-5 h-5" />
                              )}
                              <span className="font-medium">
                                {isSpotify
                                  ? "Spotify Link"
                                  : isYoutube
                                    ? "Youtube Music Link"
                                    : "Podcast Link"}
                              </span>
                            </div>
                            <ArrowSquareOutIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        );
                      })}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </aside>

          {/* Summary */}
          <div className="lg:col-span-4 grid md:grid-cols-[1fr_auto] gap-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold pb-2">Summary</h2>
                <p className="text-sm font-light leading-relaxed">
                  {movie.synopsis || "No synopsis available."}
                </p>
              </div>
              {movie.genre && movie.genre.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genre.map((g) => (
                    <Badge
                      key={g}
                      className="bg-black text-white rounded-sm text-xs font-normal"
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {directors.length > 0 && (
              // pt-8 = Summary heading line + its pb-2, so this lines up with the synopsis text
              <div className="text-sm md:min-w-48 md:pt-8">
                <span className="font-semibold">
                  Directed By:{" "}
                </span>
                <span className="font-light">
                  {directors.map((d) => d.name).join(", ")}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Top cast — names and characters only */}
        {actors.length > 0 && (
          <section className="w-full">
            <h2 className="pb-3 border-b border-black text-2xl font-semibold">
              Top Cast
            </h2>
            <div className="flex gap-4 overflow-x-auto py-6">
              {actors.map((member, idx) => (
                <div
                  key={`${member.name}-${idx}`}
                  className="flex flex-col gap-1 min-w-40 border border-black/15 rounded-sm p-4"
                >
                  <span className="text-sm font-semibold">{member.name}</span>
                  {member.characterName && (
                    <span className="text-xs font-light text-black/60">
                      {member.characterName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Member reviews */}
        <section className="w-full">
          <div className="pb-3 border-b border-black flex items-end justify-between">
            <h2 className="text-2xl font-semibold">Member Reviews</h2>
            <span className="text-sm text-black/60">
              {userRatings.length}{" "}
              {userRatings.length === 1 ? "rating" : "ratings"}
            </span>
          </div>

          {userRatings.length > 0 && (
            <div className="flex items-center gap-4 pt-6 max-w-xl">
              <ScoreBox
                score={movie.userRating}
                className="h-14 w-14 shrink-0 rounded-full"
              />
              <div className="flex flex-col gap-2 grow">
                <span className="text-sm font-semibold">
                  {getAverageRatingLabel(movie.userRating ?? 0)}
                </span>
                <DistributionBar ratings={userRatings} />
                <div className="flex gap-4 text-xs text-black/60">
                  <span>{ratingCounts(userRatings).positive} liked it</span>
                  <span>{ratingCounts(userRatings).mixed} thought it was okay</span>
                  <span>{ratingCounts(userRatings).negative} didn&apos;t like it</span>
                </div>
              </div>
            </div>
          )}

          {ratingsWithReview.length > 0 && (
            <div className="flex gap-6 border-b border-black/20 pt-6">
              {USER_REVIEW_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setReviewFilter(tab.value)}
                  className={cn(
                    "pb-2 text-sm border-b-2 -mb-px cursor-pointer transition-colors",
                    reviewFilter === tab.value
                      ? "border-black font-semibold text-black"
                      : "border-transparent text-black/60 hover:text-black",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="py-6">
            {ratingsWithReview.length === 0 ? (
              <div className="py-8 text-center">
                <EmptyReviewsIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" />
                <p className="text-black/60 text-sm">
                  No written reviews yet. Be the first to review this{" "}
                  {contentTypeLabel(movie.contentType).toLowerCase()}!
                </p>
              </div>
            ) : visibleUserReviews.length === 0 ? (
              <div className="py-8 text-center">
                <EmptyReviewsIllustration className="w-24 md:w-28 mx-auto mb-4 text-black/70" />
                <p className="text-black/60 text-sm">
                  No reviews in this category.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {visibleUserReviews.map((userRating) => (
                  <article
                    key={userRating.id}
                    className="bg-black/5 rounded-sm p-5 flex flex-col gap-3"
                  >
                    <span className="text-xs tracking-widest text-black/50 uppercase">
                      {formatDate(userRating.createdAt)}
                    </span>
                    <div className="flex items-center gap-3">
                      <ScoreBox
                        score={userRating.rating}
                        className="h-12 w-12 shrink-0 text-lg rounded-full"
                      />
                      <span className="text-lg font-semibold">
                        {userRating.username || `User ${userRating.userId.substring(0, 8)}`}
                      </span>
                    </div>
                    {userRating.review && (
                      <p className="text-sm font-light leading-relaxed">
                        {userRating.review}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Details */}
        <section className="w-full">
          <h2 className="pb-3 border-b border-black text-2xl font-semibold">
            Details
          </h2>
          <div className="flex flex-col gap-2 py-6">
            {(
              [
                ["Release Date", formatDate(movie.releaseDate)],
                ["Duration", formatRuntime(movie.runtime)],
                ["Rating", movie.rating],
                [
                  "Streaming On",
                  platform?.label ?? movie.otherPlatform ?? null,
                ],
                [
                  "Catalog Number",
                  movie.catalogNumber !== null ? `NFC #${movie.catalogNumber}` : null,
                ],
              ] as const
            )
              .filter(([, value]) => value !== null)
              .map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[8rem_1fr] lg:grid-cols-[12rem_1fr] gap-4 bg-black/5 rounded-sm px-5 py-4 text-sm"
                >
                  <span className="font-semibold">{label}:</span>
                  <span className="font-light">{value}</span>
                </div>
              ))}
            {movie.genre && movie.genre.length > 0 && (
              <div className="grid grid-cols-[8rem_1fr] lg:grid-cols-[12rem_1fr] gap-4 bg-black/5 rounded-sm px-5 py-4 text-sm items-center">
                <span className="font-semibold">Genres:</span>
                <div className="flex flex-wrap gap-2">
                  {movie.genre.map((g) => (
                    <Badge
                      key={g}
                      className="bg-black text-white rounded-sm text-xs font-normal"
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* More like this */}
        {related.length > 0 && (
          <section className="w-full">
            <h2 className="pb-3 border-b border-black text-2xl font-semibold">
              More Like This
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 py-6">
              {related.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Critic reviews — editorial article list; critic scores use a
            different scale than NFC ratings so no score boxes here */}
        {criticReviews.length > 0 && (
          <section className="w-full">
            <h2 className="pb-3 border-b border-black text-2xl font-semibold">
              Critic Reviews
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 py-6">
              {criticReviews.map((review) => (
                <Link
                  key={review.id}
                  href={review.externalUrl || `/reviews/${review.id}`}
                  target={review.externalUrl ? "_blank" : undefined}
                  className="flex flex-col gap-3 group"
                >
                  <CldImage
                    src={review.reviewImage || "nollywood-film-club/elj"}
                    alt={`${review.title} Review`}
                    width={400}
                    height={225}
                    className="w-full aspect-video object-cover rounded-sm"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    loading="lazy"
                  />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold group-hover:underline underline-offset-2">
                      {review.title}
                    </h3>
                    <span className="text-black/40 text-xs">
                      {review.reviewer}
                      {review.publishedAt && <> · {formatDate(review.publishedAt)}</>}
                    </span>
                    <p className="text-xs font-light text-black/70 line-clamp-3">
                      {review.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
