'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CldImage } from 'next-cloudinary';
import { Button } from "@/components/ui/button";
import { ExternalLink, Mic, Mic2, PlayIcon, Podcast, Youtube } from "lucide-react";
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
import { cn, scoreBadgeClass, toYoutubeEmbedUrl } from "@/lib/utils";
import MovieRatingSheet from "@/components/custom/movie-rating-sheet";

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
                router.push(`/movies/${movie.id}`, { scroll: false });
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
                    <p className="text-gray-500">No movie available</p>
                </div>
            </section>
        );
    }

    const trailerEmbedUrl = movie.trailerUrl ? toYoutubeEmbedUrl(movie.trailerUrl) : null;

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
                            {movie.contentType === 'movie' ? 'Movie' : 'TV Show'}
                        </Badge>
                    </>

                )
            }
        </h1>
        <div className=" grid lg:grid-cols-6 lg:gap-10 gap-6 py-6">
            <figure className="lg:col-span-4 flex flex-col gap-4">
                <div
                    className={`relative w-full aspect-video rounded-lg bg-black overflow-hidden group ${trailerEmbedUrl ? "cursor-pointer" : ""}`}
                    onClick={trailerEmbedUrl ? handlePlay : undefined}
                >
                    {!isPlaying ? (
                        <>
                            <CldImage
                                src={movie.posterImage || "nollywood-film-club/elj"}
                                alt={`${movie.title} Movie Poster`}
                                width={500}
                                height={500}
                                className="w-full lg:h-full h-70 object-cover"
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
                      <Link href={`/movies/${movie.id}`}>
                        <h2 className="text-xl hover:text-primary font-medium flex items-center gap-2">
                            {movie.title}
                            {movie.rating && (
                                <Badge className="text-xs text-black bg-transparent border border-black">{movie.rating}</Badge>
                            )}
                            <Badge className="text-xs text-black bg-transparent border border-black">
                                {movie.contentType === 'movie' ? 'Movie' : 'TV Show'}
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
                            <Button variant={'secondary'} className={`w-full ${movie.streamingPlatform === 'prime_video' && 'bg-prime-video'} ${movie.streamingPlatform === 'netflix' && 'bg-netflix'} text-white`}>
                                <PlayIcon className="w-4 h-4" />
                                Stream on {movie.streamingPlatform === 'prime_video' ? 'Prime Video' : movie.otherPlatform || 'Platform'}
                            </Button>
                        </Link>
                    )}
                    {hasSpaceOrPodcast && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant={'outline'} className="w-full bg-black text-white">
                                    <Mic className="w-4 h-4" />
                                    Listen to Space
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Listen to {movie.title}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Choose your preferred platform to listen to the recording of this discussion.
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
                                                <Mic2 className="w-5 h-5" />
                                                <span className="font-medium">Twitter Space Link</span>
                                            </div>
                                            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                                    {isSpotify ? <Podcast className="w-5 h-5 text-[#1DB954]" /> : isYoutube ? <Youtube className="w-5 h-5 text-[#FF0000]" /> : <Podcast className="w-5 h-5" />}
                                                    <span className="font-medium">
                                                        {isSpotify ? 'Spotify Link' : isYoutube ? 'Youtube Music Link' : 'Podcast Link'}
                                                    </span>
                                                </div>
                                                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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