import type { Metadata } from "next";
import { Footer } from "@/components/custom";
import { getScoreboard } from "@/lib/server-queries";
import ScoreboardTable from "./scoreboard-table";

export const metadata: Metadata = {
  title: "NFC Scoreboard | Nollywood Film Club",
  description: "Every movie, TV show, and short film the club has rated, ranked by NFC score.",
};

export default async function ScoreboardPage() {
  const ranked = await getScoreboard();

  return (
    <>
      <main className="min-h-screen">
        <div className="flex min-h-screen w-full flex-col px-6 py-10 lg:px-10 lg:py-8">
          <section className="w-full">
            <div className="flex items-baseline justify-between gap-4 border-b border-black">
              <h1 className="pb-3 text-2xl font-semibold">NFC Scoreboard</h1>
              <span className="pb-3 text-sm text-black/60">
                {ranked.length} {ranked.length === 1 ? "title" : "titles"} ranked
              </span>
            </div>
            <p className="pt-4 text-sm font-light text-black/60">
              Every title the club has actually rated, ranked by NFC score. Nothing with zero
              votes makes the list.
            </p>

            {ranked.length > 0 ? (
              <ScoreboardTable ranked={ranked} />
            ) : (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <h2 className="text-xl font-semibold">Nobody has rated anything yet</h2>
                <p className="max-w-md text-sm font-light text-black/60">
                  Once a title picks up its first rating, it&apos;ll show up here.
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
