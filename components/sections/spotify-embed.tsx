"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

interface SpotifyEmbedProps {
    src: string;
    title: string;
}

// Player height Spotify's embed renders at — the placeholder matches it so
// nothing shifts when the two swap.
const PLAYER_HEIGHT = 352;

// The Spotify embed paints in all at once, so the badge holds the space and
// pulses until it's ready, then the two cross-fade.
//
// The iframe is mounted after hydration on purpose: rendered on the server it
// can finish loading before React attaches onLoad, and the missed event would
// leave the player stuck invisible behind the placeholder.
export default function SpotifyEmbed({ src, title }: SpotifyEmbedProps) {
    const [mounted, setMounted] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <div className="relative w-full" style={{ height: PLAYER_HEIGHT }}>
            <div
                aria-hidden
                className={`absolute inset-0 flex items-center justify-center rounded-sm bg-black/5 transition-opacity duration-500 ${
                    loaded ? "opacity-0" : "opacity-100"
                }`}
            >
                <Image
                    src="/assets/svg/logo.svg"
                    alt=""
                    width={112}
                    height={112}
                    className="animate-pulse"
                />
            </div>

            {mounted && (
                <iframe
                    title={title}
                    src={src}
                    width="100%"
                    height={PLAYER_HEIGHT}
                    loading="lazy"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    onLoad={() => setLoaded(true)}
                    className={`absolute inset-0 w-full h-full border-none rounded-sm transition-opacity duration-500 ${
                        loaded ? "opacity-100" : "opacity-0"
                    }`}
                />
            )}
        </div>
    );
}
