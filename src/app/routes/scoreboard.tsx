import type { Route } from "./+types/scoreboard";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import Footer from "../../components/site/footer";
import ScoreboardTable from "../../components/site/scoreboard-table";

export const meta: Route.MetaFunction = () => [
  { title: "NFC Scoreboard | Nollywood Film Club" },
  {
    name: "description",
    content: "Every movie, TV show, and short film the club has rated, with its NFC score.",
  },
];

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
                {ranked.length} {ranked.length === 1 ? "title" : "titles"} scored
              </span>
            </div>
            <p className="pt-4 text-sm font-light text-black/60">
              Every title the club has actually rated, with its NFC score attached. This is a
              scoreboard, not a leaderboard: nobody is competing for first place, we are just
              keeping receipts.
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