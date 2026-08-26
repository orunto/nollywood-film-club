import { Link } from "react-router";
import {
    ArrowRightIcon,
    BroadcastIcon,
    FilmSlateIcon,
    UsersIcon,
} from "@phosphor-icons/react";
import { Sparkle } from "../graphics";
import SpotifyEmbed from "./spotify-embed";
import type { Discussion } from "../../repositories/public-read";
import { toSpotifyEmbedUrl } from "../../lib/utils";
import { posterUrl } from "../../lib/media";

interface HeroProps {
    // Newest episode/discussion, used to source the Spotify player
    latestEpisode?: Discussion | null;
    // App-served R2 poster URLs from media/nfc/ for the catalogue.
    posters?: string[];
}

const COLUMN_COUNT = 6;

export default function Hero({ latestEpisode, posters = [] }: HeroProps) {
    // Pull the Spotify link out of the latest episode's podcast links and turn
    // it into an embeddable player URL. Falls back gracefully when there's none.
    const spotifyLink = latestEpisode?.podcastLinks?.find((link) => link.includes("spotify"));
    const spotifyEmbedUrl = spotifyLink ? toSpotifyEmbedUrl(spotifyLink) : null;

    // Spread the posters across columns, rotating the start point per column so
    // neighbouring columns don't show the same poster in the same row.
    const usable = posters.filter(Boolean);
    const columns = usable.length
        ? Array.from({ length: COLUMN_COUNT }, (_, i) => {
              const offset = (i * 3) % usable.length;
              return [...usable.slice(offset), ...usable.slice(0, offset)];
          })
        : [];

    return (
        <section className="relative isolate w-full min-h-[88vh] flex overflow-hidden">
            {/* Background: angled, slow-drifting collage of the whole catalogue
                under a dark wash. Ends on a hard edge against the page below;
                fades into the solid-black nav above. */}
            <div aria-hidden className="absolute inset-0 bg-black">
                {columns.length > 0 && (
                    <div className="absolute inset-[-18%] flex gap-4 opacity-50 -rotate-6">
                        {columns.map((col, i) => {
                            const goingUp = i % 2 === 0;
                            const duration = 1200 + i * 60;
                            return (
                                <div key={i} className="flex-1 min-w-0 overflow-hidden">
                                    <div
                                        className="flex flex-col gap-3 will-change-transform"
                                        style={{
                                            animation: `nfc-marquee-${goingUp ? "up" : "down"} ${duration}s linear infinite`,
                                        }}
                                    >
                                        {/* Duplicated so the -50% translate loops seamlessly */}
                                        {[...col, ...col].map((poster, idx) => (
                                            <img
                                                key={`${i}-${idx}`}
                                                src={posterUrl(poster, { width: 220, height: 330 })}
                                                alt=""
                                                width={220}
                                                height={330}
                                                className="w-full aspect-2/3 object-cover rounded-md"
                                                loading="lazy"
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/70" />
                <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full grid lg:grid-cols-2 gap-10 lg:gap-12 items-center px-6 lg:px-10 py-16 lg:py-24">
                {/* Intro */}
                <div className="flex flex-col gap-6 text-white">
                    <span className="w-fit text-xs text-white bg-transparent border border-white rounded-sm px-2.5 py-1">
                        Live on X Spaces · Sundays · 6PM WAT
                    </span>
                    <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05]">
                        Hello and welcome to Nollywood Film Club{" "}
                        <Sparkle className="inline-block w-[0.5em] h-[0.5em] align-super text-primary" />
                    </h1>
                    <p className="text-base lg:text-lg font-light text-white/70 max-w-lg">
                        Every Sunday we pick one Nollywood film and discuss it properly:
                        what we liked in the good, what we didn&apos;t in the bad, and the
                        pushback where we disagree. Everybody&apos;s opinion is welcome here.
                        Some of them are even right.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Link
                            to="/auth"
                            className="inline-flex items-center gap-2 bg-white text-black rounded-sm text-sm font-medium px-5 py-3 hover:bg-white/85 transition-colors"
                        >
                            <UsersIcon className="w-4 h-4" />
                            Join the Club
                        </Link>
                        <Link
                            to="/movies-and-tv"
                            className="inline-flex items-center gap-2 border border-white rounded-sm text-sm font-medium px-5 py-3 text-white hover:bg-white hover:text-black transition-colors"
                        >
                            <FilmSlateIcon className="w-4 h-4" />
                            Browse Movies &amp; TV
                        </Link>
                    </div>
                </div>

                {/* Latest episode — flat editorial card, same language as the
                    site's sections: white surface, thin border, sharp corners,
                    title row underlined in black. */}
                <div className="lg:justify-self-end w-full max-w-md bg-white rounded-sm border border-black/10 p-6 flex flex-col gap-4">
                    <h2 className="pb-3 border-b border-black text-lg font-semibold flex items-center gap-2 text-black">
                        <BroadcastIcon className="w-4 h-4 text-[#1DB954]" />
                        Latest Episode
                    </h2>

                    {spotifyEmbedUrl ? (
                        <SpotifyEmbed
                            src={spotifyEmbedUrl}
                            title={`Spotify player: ${latestEpisode?.title ?? "Latest episode"}`}
                        />
                    ) : (
                        <div className="py-10 text-center">
                            <h3 className="text-xl font-semibold mb-2 text-black">Coming soon...</h3>
                            <p className="text-gray-600 text-sm">
                                The next episode lands here once we find
                                whatever catchy intro music you&apos;re about to hear.
                            </p>
                        </div>
                    )}

                    {/* Jump to the full discussion archive */}
                    <div className="flex justify-end">
                        <Link
                            to="/discussions"
                            className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-sm text-xs hover:bg-black/80 transition-colors"
                        >
                            See more
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
