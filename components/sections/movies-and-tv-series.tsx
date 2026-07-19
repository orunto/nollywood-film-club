'use client'
import Link from "next/link";
import { Content } from "@/lib/server-queries";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Asterisk, Starburst } from "@/components/graphics";
import { useCardScroller } from "@/lib/hooks/use-card-scroller";
import ContentCard from "../custom/content-card";

interface MoviesAndTVSeriesProps {
    moviesAndTVSeries: Content[];
}

export default function MoviesAndTVSeries({ moviesAndTVSeries }: MoviesAndTVSeriesProps) {
    const {
        scrollerRef,
        canScrollLeft,
        canScrollRight,
        updateScrollState,
        scrollByPage,
    } = useCardScroller();

    return <section id="movies-and-tv-series" className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 pb-3 border-b border-black">
            <h1 className="text-2xl font-semibold">Movies and TV Series</h1>

            <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto self-end sm:self-auto">
                <Link href="/movies-and-tv" className="underline text-sm">View All</Link>
                {moviesAndTVSeries && moviesAndTVSeries.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            aria-label="Scroll movies and TV series back"
                            onClick={() => scrollByPage(-1)}
                            disabled={!canScrollLeft}
                            className="w-9 h-9 flex items-center justify-center rounded-full border border-black hover:bg-black hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <CaretLeftIcon className="w-4 h-4" />
                        </button>
                        <button
                            aria-label="Scroll movies and TV series forward"
                            onClick={() => scrollByPage(1)}
                            disabled={!canScrollRight}
                            className="w-9 h-9 flex items-center justify-center rounded-full border border-black hover:bg-black hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <CaretRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>

        {moviesAndTVSeries && moviesAndTVSeries.length > 0 ? (
            <div className="relative">
                <div
                    ref={scrollerRef}
                    onScroll={updateScrollState}
                    className="flex lg:py-10 py-6 lg:gap-8 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {moviesAndTVSeries.map((item, index) => (
                        <ContentCard
                            key={index}
                            item={item}
                            className="flex-none lg:w-[calc((100%-80px)/4)] w-[calc((100%-48px)/1.4)]"
                        />
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
            <div className="lg:py-10 py-6">
                <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className={`${index >= 1 ? 'hidden md:block' : ''}`}>
                            <div className="rounded-sm shadow-none p-0 gap-8 flex flex-col border">
                            <div className="px-4 bg-primary/50 max-h-30 overflow-y-visible relative z-10 overflow-visible rounded-t-sm">
                                <div className="w-full aspect-video bg-gray-200 rounded-sm translate-y-4 relative z-10 flex items-center justify-center">
                                    <div className="text-4xl">🎬</div>
                                </div>
                            </div>
                            <div className="p-4 relative flex flex-col gap-2 lg:mt-0 mt-8">
                                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                            <div className="p-4 flex justify-between border-t items-start">
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                <div className="h-8 bg-gray-200 rounded w-12"></div>
                            </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-8">
                    <h2 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                        <Asterisk size={14} className="text-primary" />
                        Coming soon...
                    </h2>
                    <p className="text-gray-600 text-sm mb-4">
                        The catalogue is on its way. Until then, the recordings will keep you company:
                    </p>
                     <div className="flex justify-center">
                         <Link
                             href="https://linktr.ee/irokocritic"
                             target="_blank"
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-white border border-green-500 rounded-lg hover:bg-white hover:!text-green-500 hover:!no-underline transition-all duration-200 font-medium"
                         >
                             <Starburst size={16} />
                             Listen on All Platforms
                         </Link>
                     </div>
                </div>
            </div>
        )}
    </section>
}
