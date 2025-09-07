'use client';
import { CldImage } from 'next-cloudinary';
import { Button } from "@/components/ui/button";
import { Mic, PlayIcon, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useMovieOfTheWeek } from "@/lib/hooks/use-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function MovieOfTheWeek() {
    const [isPlaying, setIsPlaying] = useState(false);
    const { data: movie, isLoading, error } = useMovieOfTheWeek();

    const handlePlay = () => {
        setIsPlaying(true);
    };

    if (isLoading) {
        return (
            <section className="w-full">
                <h1 className="pb-3 border-b border-black text-2xl font-semibold">Movie of the Week</h1>
                <div className="grid lg:grid-cols-6 gap-10 py-6">
                    <div className="lg:col-span-4">
                        <Skeleton className="w-full aspect-video rounded-lg" />
                    </div>
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </section>
        );
    }

    if (error || !movie) {
        return (
            <section className="w-full">
                <h1 className="pb-3 border-b border-black text-2xl font-semibold">Movie of the Week</h1>
                <div className="py-6 text-center">
                    <p className="text-red-500">Failed to load movie of the week</p>
                </div>
            </section>
        );
    }

    return <section className="w-full">
        <h1 className="pb-3 border-b border-black text-2xl font-semibold">Movie of the Week</h1>
        <div className=" grid lg:grid-cols-6 gap-10 py-6">
            <figure className="lg:col-span-4 flex flex-col gap-4">
                <div className="relative w-full aspect-video rounded-lg bg-black overflow-hidden cursor-pointer group" onClick={handlePlay}>
                    {!isPlaying ? (
                        <>
                            <CldImage
                                src={movie.posterImage || "nollywood-film-club/elj"}
                                alt={`${movie.title} Movie Poster`}
                                width={500}
                                height={500}
                                className="w-full lg:h-full h-70 object-cover"
                                quality="auto"
                                format="auto"
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 group-hover:text-white lg:text-white/50 text-white transition-colors gap-4">
                                <span className="lg:text-lg text-base">Watch Trailer</span>
                                <div className="bg-red-500/50 lg:text-white/50 rounded-full p-4 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                    <PlayIcon className="w-8 h-8 ml-1" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
                            <iframe
                                width="100%"
                                height="100%"
                                src={`${movie.trailerUrl}&autoplay=1&rel=0&controls=1&modestbranding=1&showinfo=0&iv_load_policy=3&fs=1`}
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
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-medium flex items-center gap-2">
                        {movie.title} 
                        <Badge className="text-xs text-black bg-transparent border border-black">{movie.rating}</Badge>
                        <Badge className="text-xs text-black bg-transparent border border-black">
                            {movie.contentType === 'movie' ? 'Movie' : 'TV Show'}
                        </Badge>
                    </h2>
                    <span className="text-xs font-light">Run Time: {movie.runtime ? `${Math.floor(movie.runtime / 60)} h ${movie.runtime % 60} min` : 'N/A'}</span>
                    <span className="text-xs font-light">Theatrical Release Date: {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'}</span>
                    {movie.genre && movie.genre.length > 0 && (
                        <span className="text-xs font-light">Genre: {movie.genre.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}</span>
                    )}
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
                            <Button variant={'secondary'} className="w-full bg-prime-video text-white">
                                <PlayIcon className="w-4 h-4" />
                                Stream on {movie.streamingPlatform === 'prime_video' ? 'Prime Video' : movie.otherPlatform || 'Platform'}
                            </Button>
                        </Link>
                    )}
                    {movie.spaceUrl && (
                        <Link target="_blank" href={movie.spaceUrl}>
                            <Button variant={'outline'} className="w-full bg-black text-white">
                                <Mic className="w-4 h-4" />
                                Join the Space
                            </Button>
                        </Link>
                    )}
                </div>

                <div title="Come back after our space 😉" className="w-full">
                    <Button disabled variant={'outline'} className="w-full py-4 border-primary text-primary">Rate this Movie <Star /></Button>
                </div>
            </div>

        </div>
    </section>
}