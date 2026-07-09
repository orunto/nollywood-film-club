"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardTitle, CardHeader, CardContent, CardDescription, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Discussion } from "@/lib/server-queries";
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
    const scrollerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    // Cards partially cut off by the scroller's edges get blurred
    const [fullyVisible, setFullyVisible] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        const observer = new IntersectionObserver(
            (entries) => {
                setFullyVisible((prev) => {
                    const next = { ...prev };
                    for (const entry of entries) {
                        const idx = Number((entry.target as HTMLElement).dataset.index);
                        next[idx] = entry.intersectionRatio >= 0.9;
                    }
                    return next;
                });
            },
            { root: scroller, threshold: [0.9] },
        );
        cardRefs.current.forEach((card) => card && observer.observe(card));
        return () => observer.disconnect();
    }, [discussions.length]);

    const updateScrollState = () => {
        const el = scrollerRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    };

    // Page one full set of cards at a time, landing so the window of fully
    // visible cards is centered with a cut-off card peeking on each side
    // (except at the very start/end, where the browser clamps the scroll).
    // Free scrolling (wheel/touch) is untouched — no CSS snapping.
    const scrollByPage = (direction: -1 | 1) => {
        const el = scrollerRef.current;
        if (!el) return;
        const cards = Array.from(el.children) as HTMLElement[];
        if (cards.length < 2) return;
        const step = cards[1].offsetLeft - cards[0].offsetLeft; // card width + gap
        const gap = step - cards[0].offsetWidth;
        const perPage = Math.max(1, Math.floor((el.clientWidth + gap) / step));
        const peek = (el.clientWidth - perPage * step + gap) / 2;
        const firstVisible = Math.round((el.scrollLeft + peek) / step);
        const targetFirst = firstVisible + direction * perPage;
        el.scrollTo({
            left: targetFirst <= 0 ? 0 : targetFirst * step - peek,
            behavior: "smooth",
        });
    };

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
            <div
                ref={scrollerRef}
                onScroll={updateScrollState}
                className="flex lg:py-10 py-6 lg:gap-8 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {discussions.map((discussion, index) => (
                    <Card
                        key={index}
                        ref={(node: HTMLDivElement | null) => { cardRefs.current[index] = node; }}
                        data-index={index}
                        className={`flex-none lg:w-[calc((100%-160px)/4.4)] w-[calc((100%-48px)/1.4)] rounded-sm shadow-none p-6 border border-black/10 flex flex-col justify-between ${fullyVisible[index] === false ? "blur-[3px] opacity-60" : ""}`}
                    >
                        <div>
                            <CardHeader className="p-0 mb-4">
                                <div className="flex flex-col gap-2 mb-2">
                                    <Badge className="w-fit text-xs text-black bg-transparent border border-black">
                                        {discussion.content
                                            ? (discussion.content.contentType === 'movie' ? 'Movie Discussion' : 'TV Show Discussion')
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
                                    {discussion.description || discussion.content?.synopsis || "Join our deep dive into this Nollywood masterpiece."}
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
                                                Choose your preferred platform to listen to the recording of this discussion.
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
                                <span className="text-sm text-black/40 italic">Recording coming soon...</span>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="lg:py-10 py-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Coming Soon...</h2>
                <p className="text-gray-600 text-sm">
                    More discussions will appear here soon.
                </p>
            </div>
        )}
    </section>
}
