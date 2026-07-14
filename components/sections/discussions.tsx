"use client";

import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Discussion } from "@/lib/server-queries";
import { useCardScroller } from "@/lib/hooks/use-card-scroller";
import { contentTypeLabel } from "@/lib/utils";
import { Calendar, Mic2, Podcast, Youtube, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../ui/alert-dialog";

interface DiscussionsProps {
    discussions: Discussion[];
}

export default function Discussions({ discussions }: DiscussionsProps) {
    const {
        scrollerRef,
        canScrollLeft,
        canScrollRight,
        updateScrollState,
        scrollByPage,
    } = useCardScroller();

    return <section id="discussions" className="w-full">
        <div className="flex items-end justify-between pb-3 border-b border-black">
            <h1 className="text-2xl font-semibold">Discussions</h1>
            {discussions && discussions.length > 0 && (
                <div className="flex items-center gap-2">
                    <button
                        aria-label="Scroll discussions back"
                        onClick={() => scrollByPage(-1)}
                        disabled={!canScrollLeft}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-black hover:bg-black hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        aria-label="Scroll discussions forward"
                        onClick={() => scrollByPage(1)}
                        disabled={!canScrollRight}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-black hover:bg-black hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>

        {discussions && discussions.length > 0 ? (
            <div className="relative">
                <div
                    ref={scrollerRef}
                    onScroll={updateScrollState}
                    className="flex lg:py-10 py-6 lg:gap-8 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                {discussions.map((discussion, index) => (
                    <Card
                        key={index}
                        className="flex-none lg:w-[calc((100%-160px)/4.4)] w-[calc((100%-48px)/1.4)] rounded-sm shadow-none p-6 border border-black/10 flex flex-col justify-between"
                    >
                        <div>
                            <CardHeader className="p-0 mb-4">
                                <div className="flex flex-col gap-2 mb-2">
                                    <Badge className="w-fit text-xs text-black bg-transparent border border-black">
                                        {discussion.content
                                            ? `${contentTypeLabel(discussion.content.contentType)} Discussion`
                                            : 'Club Discussion'}
                                    </Badge>
                                    {(discussion.discussionDate || discussion.content?.releaseDate) && (
                                        <div className="flex items-center gap-1 text-xs text-black/60">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(discussion.discussionDate || discussion.content!.releaseDate!).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    )}
                                </div>
                                <CardTitle className="text-base font-bold line-clamp-2">
                                    {discussion.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="p-0 mb-6">
                                <CardDescription className="text-sm font-light text-black/70 line-clamp-3">
                                    {discussion.description || discussion.content?.synopsis || "“Masterpiece” is a strong word. Come and hear what we actually thought."}
                                </CardDescription>
                            </CardContent>
                        </div>

                        <CardFooter className="p-0 pt-4 border-t flex flex-wrap gap-3">
                            {(discussion.spaceUrl || (discussion.podcastLinks && discussion.podcastLinks.length > 0)) ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-sm text-xs hover:bg-black/80 transition-colors cursor-pointer">
                                            <Mic2 className="w-4 h-4" />
                                            Listen to Space
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Listen to {discussion.title}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Pick your platform. The opinions are the same on all of them.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="flex flex-col gap-2 py-4">
                                            {discussion.spaceUrl && (
                                                <a
                                                    href={discussion.spaceUrl}
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
                                            {discussion.podcastLinks?.map((link, idx) => {
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
                            ) : (
                                <span className="text-sm text-black/40 italic">Recording coming soon. Cletus is on it.</span>
                            )}
                        </CardFooter>
                    </Card>
                ))}
                </div>

                <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 backdrop-blur-[2px] transition-opacity duration-300 [mask-image:linear-gradient(to_right,black,transparent)] ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
                />
                <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 backdrop-blur-[2px] transition-opacity duration-300 [mask-image:linear-gradient(to_left,black,transparent)] ${canScrollRight ? "opacity-100" : "opacity-0"}`}
                />
            </div>
        ) : (
            <div className="lg:py-10 py-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Coming soon...</h2>
                <p className="text-gray-600 text-sm">
                    The Sundays keep coming, and so do we. Discussions land here shortly.
                </p>
            </div>
        )}
    </section>
}
