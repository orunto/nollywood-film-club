'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CldImage } from 'next-cloudinary';
import { Button } from "@/components/ui/button";
import { ArrowSquareOutIcon, MicrophoneIcon, MicrophoneStageIcon, PlayIcon, BroadcastIcon, YoutubeLogoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Content } from "@/lib/server-queries";
import { cn, scoreBadgeClass, toYoutubeEmbedUrl, contentTypeLabel, contentPath } from "@/lib/utils";
import MovieRatingSheet from "@/components/custom/movie-rating-sheet";

export const STREAMING_PLATFORMS: Record<string, {
    label: string;
    className: string;
    logo: string;
    showLabel?: boolean; // show the name alongside the logo when the logo mark alone doesn't spell out the brand name
}> = {
    netflix: { label: "Netflix", className: "bg-netflix hover:bg-netflix/90 text-white hover:text-white [&_img]:w-14 [&_img]:h-auto", logo: "/logos/streaming/netflix.svg", showLabel: true },
    prime_video: { label: "Prime Video", className: "bg-prime-video hover:bg-prime-video/90 text-white hover:text-white [&_img]:w-20 [&_img]:h-auto", logo: "/logos/streaming/prime_video.svg" },
    youtube: { label: "YouTube", className: "bg-youtube hover:bg-youtube/90 text-white hover:text-white [&_img]:w-16 [&_img]:h-auto", logo: "/logos/streaming/youtube.svg", showLabel: true },
    disney_plus: { label: "Disney+", className: "bg-disney-plus hover:bg-disney-plus/90 text-white hover:text-white", logo: "/logos/streaming/disney_plus.svg" },
    hulu: { label: "Hulu", className: "bg-hulu hover:bg-hulu/90 text-black hover:text-black", logo: "/logos/streaming/hulu.svg", showLabel: true },
    hbo_max: { label: "Max", className: "bg-hbo-max hover:bg-hbo-max/90 text-white hover:text-white", logo: "/logos/streaming/hbo_max.svg" },
    apple_tv: { label: "Apple TV", className: "bg-apple-tv hover:bg-apple-tv/90 text-white hover:text-white", logo: "/logos/streaming/apple_tv.svg" },
    paramount_plus: { label: "Paramount+", className: "bg-paramount-plus hover:bg-paramount-plus/90 text-white hover:text-white", logo: "/logos/streaming/paramount_plus.svg" },
    peacock: { label: "Peacock", className: "bg-peacock hover:bg-peacock/90 text-white hover:text-white", logo: "/logos/streaming/peacock.svg", showLabel: true },
};

interface MovieHeroProps {
    movie: Content | null;
    title?: string; // Optional title, defaults to "Movie of the Week" or movie title based on context
    showRating?: boolean; // Whether to show the rating functionality
    spaceUrl?: string | null; // Twitter/X Space URL from the movie's discussion
    podcastLinks?: string[] | null; // Podcast platform links from the movie's discussion
}

export default function MovieHero({ movie, title, showRating = true, spaceUrl, podcastLinks }: MovieHeroProps) {
    const router = useRouter();
    const [isPlaying, setIsPlaying] = useState(false);

    const hasPodcastLink = Boolean(podcastLinks && podcastLinks.length > 0);
    const hasSpaceOrPodcast = Boolean(spaceUrl || hasPodcastLink);

    // Check if 24 hours have passed since the movie was created, or skip the
    // wait entirely once the podcast episode discussing it is actually out
    const isRatingEnabled = hasPodcastLink || (movie && movie.createdAt &&
        (new Date().getTime() - new Date(movie.createdAt).getTime()) > (24 * 60 * 60 * 1000));

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handleRatingSubmit = () => {
        if (movie) {
            setTimeout(() => {
                router.push(contentPath(movie), { scroll: false });
            }, 500);

        }
    };

    if (!movie) {
        return (
            <section className="w-full">
                <h1 className="pb-3 border-b border-black text-2xl font-semibold">
                    {title || "Movie of the Week"}
                </h1>
                <div className="py-6 text-center">
                    <p className="text-gray-500">No film this week. Even haters deserve rest.</p>
                </div>
            </section>
        );
    }

    const trailerEmbedUrl = movie.trailerUrl ? toYoutubeEmbedUrl(movie.trailerUrl) : null;
    const platform = movie.streamingPlatform ? STREAMING_PLATFORMS[movie.streamingPlatform] : null;

    return <section className="w-full">
        <h1 className="pb-3 border-b border-black text-2xl font-semibold flex items-center gap-3">
            {title || movie.title}

            {
                !showRating && (
                    <>
                        {movie.rating && (
                            <Badge className="text-xs text-black bg-transparent border border-black">{movie.rating}</Badge>
                        )}
                        <Badge className="text-xs text-black bg-transparent border border-black">
                            {contentTypeLabel(movie.contentType)}
                        </Badge>
                    </>

                )
            }
        </h1>
        <div className=" grid lg:grid-cols-6 lg:gap-10 gap-6 py-6">
            <figure className="lg:col-span-4 flex flex-col gap-4 aspect-video">
                <div
                    className={`relative w-full h-full rounded-lg bg-black overflow-hidden group ${trailerEmbedUrl ? "cursor-pointer" : ""}`}
                    onClick={trailerEmbedUrl ? handlePlay : undefined}
                >
                    {!isPlaying ? (
                        <>
                            <CldImage
                                src={movie.posterImage || "nollywood-film-club/elj"}
                                alt={`${movie.title} Movie Poster`}
                                width={500}
                                height={500}
                                className="w-full h-full object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 group-hover:text-white lg:text-white/50 text-white transition-colors gap-4">
                                <span className="lg:text-lg text-base">{trailerEmbedUrl ? "Watch Trailer" : "Trailer: N/A"}</span>
                                {trailerEmbedUrl && (
                                    <div className="bg-red-500/50 lg:text-white/50 rounded-full p-4 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                        <PlayIcon className="w-8 h-8 ml-1" />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
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
                        </div>
                    )}
                </div>
            </figure>
            <div className="lg:col-span-2 flex flex-col gap-2">
              <div className="flex gap-4">
                    {
                      (!showRating) && (
                        <Badge
                            className={cn(
                                "font-medium h-20 w-20 p-4",
                                movie.userRating === null ? "text-sm" : "text-3xl",
                                scoreBadgeClass(movie.userRating),
                            )}
                        >
                          {movie.userRating ?? "N/A"}
                        </Badge>
                      )
                    }
                
                <div className="flex flex-col gap-1">
                    {showRating && (
                      <Link href={contentPath(movie)}>
                        <h2 className="text-xl hover:text-primary font-medium flex items-center gap-2">
                            {movie.title}
                            {movie.rating && (
                                <Badge className="text-xs text-black bg-transparent border border-black">{movie.rating}</Badge>
                            )}
                            <Badge className="text-xs text-black bg-transparent border border-black">
                                {contentTypeLabel(movie.contentType)}
                            </Badge>
                        </h2>
                      </Link>
                    )}
                    <span className="text-xs font-light">Run Time: {movie.runtime ? `${Math.floor(movie.runtime / 60)} h ${movie.runtime % 60} min` : 'N/A'}</span>
                    <span className="text-xs font-light">
                        Theatrical Release Date: {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                    <span className="text-xs font-light">
                        Genre: {movie.genre && movie.genre.length > 0 ? movie.genre.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ') : 'N/A'}
                    </span>
                </div>
              </div>

                {/* Mobile Accordion */}
                <Accordion type="single" collapsible className="w-full lg:hidden">
                    <AccordionItem value="synopsis">
                        <AccordionTrigger className="text-lg font-medium text-left">
                            Synopsis
                        </AccordionTrigger>
                        <AccordionContent>
                            <p className="text-sm font-light">
                                {movie.synopsis || 'No synopsis available.'}
                            </p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Desktop Static */}
                <div className="flex-col gap-1 hidden lg:flex">
                    <header className="text-lg font-medium">
                        Synopsis
                    </header>
                    <p className="text-sm font-light">
                        {movie.synopsis || 'No synopsis available.'}
                    </p>
                </div>

                <div className="w-full pt-2 grid items-center gap-2">
                    {movie.streamingUrl && (
                        <Link target="_blank" href={movie.streamingUrl}>
                            <Button variant={'secondary'} className={cn("w-full py-4 max-h-13 flex gap-0", platform?.className)}>
                                Stream on
                                <span className="inline-flex items-center gap-1.5 font-semibold">
                                    {platform ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={platform.logo} alt={`${platform.label} logo`}  />
                                    ) : (
                                        <PlayIcon className="w-4 h-4" />
                                    )}
                                    {/*{(!platform || platform.showLabel) && (platform?.label || movie.otherPlatform || 'Platform')}*/}
                                </span>
                            </Button>
                        </Link>
                    )}
                    {hasSpaceOrPodcast && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant={'outline'} className="w-full py-4 bg-black text-white">
                                    <MicrophoneIcon className="w-4 h-4" />
                                    Listen to Space
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Listen to {movie.title}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Pick your platform. The opinions are the same on all of them.
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
                                        const isSpotify = link.includes('spotify');
                                        const isYoutube = link.includes('youtube');

                                        return (
                                            <a
                                                key={idx}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-3 border rounded-sm hover:bg-black/5 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {isSpotify ? <BroadcastIcon className="w-5 h-5 text-[#1DB954]" /> : isYoutube ? <YoutubeLogoIcon className="w-5 h-5 text-[#FF0000]" /> : <BroadcastIcon className="w-5 h-5" />}
                                                    <span className="font-medium">
                                                        {isSpotify ? 'Spotify Link' : isYoutube ? 'Youtube Music Link' : 'Podcast Link'}
                                                    </span>
                                                </div>
                                                <ArrowSquareOutIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        )
                                    })}
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Close</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>

                <MovieRatingSheet
                    movieId={movie.id}
                    movieTitle={movie.title}
                    isRatingEnabled={isRatingEnabled || false}
                    onRatingSubmit={handleRatingSubmit}
                />
            </div>

        </div>
    </section>
}
