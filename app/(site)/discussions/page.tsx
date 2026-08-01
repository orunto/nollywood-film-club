import type { Metadata } from "next";
import Image from "next/image";
import { BroadcastIcon, PlayIcon, UsersIcon } from "@phosphor-icons/react/dist/ssr";
import { Footer } from "@/components/custom";
import { Sparkle, Starburst, EmptyListIllustration } from "@/components/graphics";
import SpotifyEmbed from "@/components/sections/spotify-embed";
import EpisodeRow from "./episode-row";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getAllDiscussions, countDiscussions } from "@/lib/server-queries";
import { episodeLabel, toSpotifyEmbedUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Discussions | Nollywood Film Club",
  description:
    "Every Space, every episode. The full record of what the club talked about and when.",
};

const PAGE_SIZE = 24;

export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const parsed = parseInt(rawPage ?? "", 10);
  const requested = Number.isNaN(parsed) ? 1 : Math.max(parsed, 1);

  const total = await countDiscussions();
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const page = Math.min(requested, totalPages);

  const [discussions, [latest]] = await Promise.all([
    getAllDiscussions({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getAllDiscussions({ limit: 1 }),
  ]);

  const spotifyLink = latest?.podcastLinks?.find((link) => link.includes("spotify"));
  const spotifyEmbedUrl = spotifyLink ? toSpotifyEmbedUrl(spotifyLink) : null;

  const pageHref = (target: number) => (target <= 1 ? "/discussions" : `/discussions?page=${target}`);

  return (
    <>
      <main className="min-h-screen">
        {/* Show header — the club's "station," Spotify-podcast-page shaped:
            cover mark, identity, stats, and the latest episode ready to play. */}
        <section className="relative isolate w-full overflow-hidden bg-black text-white">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <Starburst className="absolute -top-6 right-[12%] w-24 text-white/[0.06] lg:w-36" />
            <Sparkle className="absolute bottom-10 left-[8%] w-14 text-primary/40" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.04] to-transparent" />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-14 lg:flex-row lg:items-end lg:gap-10 lg:px-10 lg:py-20">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-sm border border-white/15 bg-white/[0.06] lg:h-40 lg:w-40">
              <Image
                src="/assets/svg/logo.svg"
                alt=""
                width={72}
                height={72}
                className="h-12 w-12 lg:h-16 lg:w-16"
              />
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                Podcast
              </span>
              <h1 className="text-4xl font-bold leading-[1.05] lg:text-6xl">Discussions</h1>
              <p className="max-w-xl text-sm font-light text-white/70 lg:text-base">
                Every Sunday we pick one film and talk about it until somebody is wrong. This
                is the full record: {total} {total === 1 ? "episode" : "episodes"} of the good,
                the bad, and the pushback.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-white/50">
                <span className="flex items-center gap-1.5">
                  <BroadcastIcon className="h-3.5 w-3.5" />
                  Live Sundays · 6PM WAT · X Spaces
                </span>
                <span aria-hidden>·</span>
                <span>
                  {total} {total === 1 ? "episode" : "episodes"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="https://linktr.ee/irokocritic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85"
                >
                  <PlayIcon weight="fill" className="h-4 w-4" />
                  Listen Everywhere
                </a>
                <a
                  href="https://x.com/irokocritic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm border border-white px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
                >
                  <UsersIcon className="h-4 w-4" />
                  Follow @irokocritic
                </a>
              </div>
            </div>
          </div>

          {latest && (
            <div className="relative z-10 border-t border-white/10 bg-white/[0.03] px-6 py-8 lg:px-10">
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
                  Latest episode
                </span>
                <h2 className="text-lg font-semibold">
                  {episodeLabel(latest.episodeNumber, latest.title)}
                </h2>
                {spotifyEmbedUrl ? (
                  <SpotifyEmbed
                    src={spotifyEmbedUrl}
                    title={`Spotify player: ${latest.title}`}
                  />
                ) : (
                  <p className="text-sm italic text-white/50">
                    Recording coming soon.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Episode archive */}
        <div className="flex w-full flex-col px-6 py-10 lg:px-10 lg:py-8">
          <section className="w-full">
            <div className="flex items-baseline justify-between gap-4 border-b border-black">
              <h2 className="pb-3 text-2xl font-semibold">All Episodes</h2>
              <span className="pb-3 text-sm text-black/60">
                {total} {total === 1 ? "episode" : "episodes"}
              </span>
            </div>

            {discussions.length > 0 ? (
              <>
                <div className="flex flex-col divide-y divide-black/10 py-2">
                  {discussions.map((discussion) => (
                    <EpisodeRow key={discussion.id} discussion={discussion} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination className="pb-10 pt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href={pageHref(page - 1)}
                          aria-disabled={page === 1}
                          className={page === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink href={pageHref(p)} isActive={p === page}>
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href={pageHref(page + 1)}
                          aria-disabled={page === totalPages}
                          className={
                            page === totalPages ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <EmptyListIllustration className="w-24 text-black/70 md:w-28" />
                <h2 className="text-xl font-semibold">Nobody has said anything yet</h2>
                <p className="max-w-md text-sm font-light text-black/60">
                  The Sundays keep coming, and so do we. Episodes land here shortly.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
