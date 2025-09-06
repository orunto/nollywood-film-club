"use client"
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Mic, PlayIcon, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const handlePlay = () => {
    setIsPlaying(true);
  };

  return <main className="w-full flex flex-col lg:p-10 py-10 px-6">
    <section className="w-full">
      <h1 className="pb-3 border-b border-black text-2xl font-semibold">Movie of the Week</h1>
      <div className=" grid lg:grid-cols-6 gap-10 py-6">
        <figure className="lg:col-span-4 flex flex-col gap-4">
          <div className="relative w-full lg:h-90 h-70 rounded-lg bg-black overflow-hidden cursor-pointer group" onClick={handlePlay}>
            {!isPlaying ? (
              <>
                <Image 
                  src="/assets/webp/elj.webp" 
                  alt="Hero" 
                  width={500} 
                  height={500} 
                  className="w-full lg:h-full h-70 object-contain" 
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                  <div className="bg-white/90 rounded-full p-4 group-hover:bg-white transition-colors">
                    <PlayIcon className="w-8 h-8 text-black ml-1" />
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
            <span className="text-xs font-light">Run Time: 1h 30min</span>
            <span className="text-xs font-light">Theatrical Release Date: 2000</span>
            <span className="text-xs font-light">Genre: Comedy</span>
          </div>

          <div className="flex flex-col gap-1">
            <header className="text-lg font-medium">
              Synopsis
            </header>

            <p className="text-sm font-light">
              Jenifa&apos;s popularity fades when a shady new neighbor, Lobster, outshines her charity work. In Ghana, Jenifa and friends face a deadly drug baron after a bag of drugs is mistakenly left in their rental.
            </p>
          </div>

          <div className="w-full pt-2 grid items-center gap-2">
            <Button variant={'secondary'} className="w-full bg-prime-video text-white">
              <PlayIcon className="w-4 h-4" />
              Stream on Prime Video
            </Button>
            <Button variant={'outline'} className="w-full bg-black text-white">
              <Mic className="w-4 h-4" />
              Join the Space
            </Button>
          </div>

          <div title="Come back after our space 😉" className="w-full">
            <Button disabled variant={'outline'} className="w-full py-4 border-primary text-primary">Rate this Movie <Star/></Button>
          </div>
        </div>

      </div>
    </section>
  </main>
}
