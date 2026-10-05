import type { Route } from "./+types/scoreboard";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import Footer from "../../components/site/footer";
import ScoreboardTable from "../../components/site/scoreboard-table";
import { pageMeta } from "../../lib/meta";

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: "Nollywood Film Ratings & NFC Scores | Nollywood Film Club",
    description:
      "Compare Nollywood movies, TV shows and short films by NFC audience score. Every listed title has at least 25 ratings, counting every eligible vote equally.",
    path: "/scoreboard",
  });

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const ranked = await services.db.publicReads.getScoreboard();
  return { ranked };
}

export default function ScoreboardPage() {
  const { ranked } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="min-h-screen">
        <div className="flex min-h-screen w-full flex-col px-6 py-10 lg:px-10 lg:py-8">
          <section className="w-full">
            <div className="flex items-baseline justify-between gap-4 border-b border-black">
              <h1 className="pb-3 text-2xl font-semibold">NFC Scoreboard</h1>
              <span className="pb-3 text-sm text-black/60">
                {ranked.length} {ranked.length === 1 ? "title" : "titles"}
              </span>
            </div>
            <p className="pt-4 text-sm font-light text-black/60">
              Every title with at least 25 ratings, with its average score shown as a percentage. This is a
              scoreboard, not a leaderboard: nobody is competing for first place, we are just
              keeping receipts.
            </p>

            {ranked.length > 0 ? (
              <ScoreboardTable ranked={ranked} />
            ) : (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <h2 className="text-xl font-semibold">No titles have enough ratings yet</h2>
                <p className="max-w-md text-sm font-light text-black/60">
                  Once a title reaches 25 ratings, it&apos;ll show up here.
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
