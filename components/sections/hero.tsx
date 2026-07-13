import Link from "next/link";
import { ArrowRight, Film, Podcast, Users } from "lucide-react";
import { Discussion } from "@/lib/server-queries";
import { toSpotifyEmbedUrl } from "@/lib/utils";

interface HeroProps {
    // Newest episode/discussion, used to source the Spotify player
    latestEpisode?: Discussion | null;
    // Cloudinary public IDs for every film in the catalogue — powers the
    // moving poster-wall background.
    posters?: string[];
}

const COLUMN_COUNT = 6;

// Build a small, optimised Cloudinary delivery URL for a poster public ID.
// Kept as a plain <img> so the decorative background stays in the server
// component (CldImage would drag in a client boundary via useState).
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
function posterUrl(publicId: string): string {
    // Some rows store a full delivery URL instead of a bare public ID —
    // pass those through untouched so they don't 404.
    if (publicId.startsWith("http")) return publicId;
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_220,h_330,q_auto,f_auto/${publicId}`;
}

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
                    <div className="absolute -inset-[18%] flex gap-4 opacity-50 -rotate-6">
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
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={`${i}-${idx}`}
                                                src={posterUrl(poster)}
                                                alt=""
                                                width={220}
                                                height={330}
                                                className="w-full aspect-[2/3] object-cover rounded-md"
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
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black to-transparent" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full grid lg:grid-cols-2 gap-10 lg:gap-12 items-center px-6 lg:px-10 py-16 lg:py-24">
                {/* Intro */}
                <div className="flex flex-col gap-6 text-white">
                    <span className="w-fit text-xs text-white bg-transparent border border-white rounded-sm px-2.5 py-1">
                        Sundays · 6PM WAT
                    </span>
                    <h1 className="text-4xl lg:text-6xl font-bold leading-[1.05]">
                        Welcome to Nollywood Film Club
                    </h1>
                    <p className="text-base lg:text-lg font-light text-white/70 max-w-lg">
                        Where we pick a movie to discuss on Sundays at 6pm WAT. Now you can
                        keep up with our discussions through the years and share your thoughts.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Link
                            href="/auth"
                            className="inline-flex items-center gap-2 bg-white text-black rounded-sm text-sm font-medium px-5 py-3 hover:bg-white/85 transition-colors"
                        >
                            <Users className="w-4 h-4" />
                            Join the Club
                        </Link>
                        <Link
                            href="/movies-and-tv"
                            className="inline-flex items-center gap-2 border border-white rounded-sm text-sm font-medium px-5 py-3 text-white hover:bg-white hover:text-black transition-colors"
                        >
                            <Film className="w-4 h-4" />
                            Browse Movies &amp; TV
                        </Link>
                    </div>
                </div>

                {/* Latest episode — flat editorial card, same language as the
                    site's sections: white surface, thin border, sharp corners,
                    title row underlined in black. */}
                <div className="lg:justify-self-end w-full max-w-md bg-white rounded-sm border border-black/10 p-6 flex flex-col gap-4">
                    <h2 className="pb-3 border-b border-black text-lg font-semibold flex items-center gap-2 text-black">
                        <Podcast className="w-4 h-4 text-[#1DB954]" />
                        Latest Episode
                    </h2>

                    {spotifyEmbedUrl ? (
                        <iframe
                            title={`Spotify player: ${latestEpisode?.title ?? "Latest episode"}`}
                            src={spotifyEmbedUrl}
                            width="100%"
                            height="352"
                            frameBorder="0"
                            loading="lazy"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            allowFullScreen
                            className="w-full rounded-sm"
                        />
                    ) : (
                        <div className="py-10 text-center">
                            <h3 className="text-xl font-semibold mb-2 text-black">Coming Soon...</h3>
                            <p className="text-gray-600 text-sm">
                                Our latest discussion will stream right here as soon as it drops.
                            </p>
                        </div>
                    )}

                    {/* Jump to the full discussion archive */}
                    <div className="flex justify-end">
                        <Link
                            href="/#discussions"
                            className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-sm text-xs hover:bg-black/80 transition-colors"
                        >
                            See more
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
