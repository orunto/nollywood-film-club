'use client';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Mic, PlayIcon, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function MovieOfTheWeek() {
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = () => {
        setIsPlaying(true);
    };
    return <section className="w-full">
        <h1 className="pb-3 border-b border-black text-2xl font-semibold">Movie of the Week</h1>
        <div className=" grid lg:grid-cols-6 gap-10 py-6">
            <figure className="lg:col-span-4 flex flex-col gap-4">
                <div className="relative w-full aspect-video rounded-lg bg-black overflow-hidden cursor-pointer group" onClick={handlePlay}>
                    {!isPlaying ? (
                        <>
                            <Image
                                src="/assets/webp/elj.webp"
                                alt="Hero"
                                width={500}
                                height={500}
                                className="w-full lg:h-full h-70 object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 group-hover:text-white lg:text-white/50 text-white transition-colors gap-4">
                                <span className="lg:text-lg text-base">Watch Trailer</span>
                                <div className="bg-red-500/50 lg:text-white/50 rounded-full p-4 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                    <PlayIcon className="w-8 h-8 ml-1" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/x4JIoP5FlhU?si=s-yYKArOOO6QD42e?autoplay=1&rel=0"
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    )}
                </div>
            </figure>
            <div className="lg:col-span-2 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-medium flex items-center gap-2">Everybody Loves Jenifa <Badge className="text-xs text-black bg-transparent border border-black">PG-13</Badge></h2>
                    <span className="text-xs font-light">Run Time: 2 h 15 min</span>
                    <span className="text-xs font-light">Theatrical Release Date: 2000</span>
                    <span className="text-xs font-light">Genre: Comedy, Drama</span>
                </div>

                {/* Mobile Accordion */}
                <Accordion type="single" collapsible className="w-full lg:hidden">
                    <AccordionItem value="synopsis">
                        <AccordionTrigger className="text-lg font-medium text-left">
                            Synopsis
                        </AccordionTrigger>
                        <AccordionContent>
                            <p className="text-sm font-light">
                                Jenifa must navigate through jealousy and suspicion when her philanthropy position is threatened by her new neighbour in the estate. A trip to Ghana with friends turns dangerous when they are caught up in a drug scandal, forcing Jenifa to confront betrayal and danger, risking everything to protect her reputation and life.
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
                        Jenifa must navigate through jealousy and suspicion when her philanthropy position is threatened by her new neighbour in the estate. A trip to Ghana with friends turns dangerous when they are caught up in a drug scandal, forcing Jenifa to confront betrayal and danger, risking everything to protect her reputation and life.
                    </p>
                </div>

                <div className="w-full pt-2 grid items-center gap-2">
                    <Link target="_blank" href="https://www.primevideo.com/detail/Everybody-Loves-Jenifa/0G4DEZL3GDUGGLRPTKG19ZFEEE">
                        <Button variant={'secondary'} className="w-full bg-prime-video text-white">
                            <PlayIcon className="w-4 h-4" />
                            Stream on Prime Video
                        </Button>
                    </Link>
                    <Link target="_blank" href="https://x.com/i/spaces/1djGXWjZOORKZ">
                        <Button variant={'outline'} className="w-full bg-black text-white">
                            <Mic className="w-4 h-4" />
                            Join the Space
                        </Button>
                    </Link>
                </div>

                <div title="Come back after our space 😉" className="w-full">
                    <Button disabled variant={'outline'} className="w-full py-4 border-primary text-primary">Rate this Movie <Star /></Button>
                </div>
            </div>

        </div>
    </section>
}