import type { Route } from "./+types/home";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import { getHomepageData } from "../../services/homepage";
import Footer from "../../components/site/footer";
import { Hero, MovieOfTheWeek, MoviesAndTVSeries, Reviews, Discussions } from "../../components/sections";
import { isCatalogPosterUrl } from "../../lib/media";

export const meta: Route.MetaFunction = () => [
  { title: "Nollywood Film Club" },
];

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const [{ movieOfTheWeek, movieOfTheWeekDiscussion, moviesAndTVSeries, reviews, discussions }, allContent] =
    await Promise.all([
      getHomepageData(services.db.publicReads),
      services.db.publicReads.getAllContent(),
    ]);

  // Feature the newest episode that has a Spotify link in the hero player,
  // falling back to the latest discussion overall (discussions are newest-first).
  const latestEpisode =
    discussions.find((d) => d.podcastLinks?.some((l) => l.includes("spotify"))) ??
    discussions[0] ??
    null;

  // Only migrated catalogue posters in R2 feed the hero's poster wall. This
  // excludes legacy Cloudinary IDs and media stored outside media/nfc/.
  const posters = allContent
    .map((item) => item.posterImage)
    .filter(isCatalogPosterUrl);

  return {
    movieOfTheWeek,
    movieOfTheWeekDiscussion,
    moviesAndTVSeries,
    reviews,
    discussions,
    latestEpisode,
    posters,
  };
}

export default function Home() {
  const {
    movieOfTheWeek,
    movieOfTheWeekDiscussion,
    moviesAndTVSeries,
    reviews,
    discussions,
    latestEpisode,
    posters,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="min-h-screen">
        <Hero latestEpisode={latestEpisode} posters={posters} />
        <div className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 gap-15">
          <MovieOfTheWeek movie={movieOfTheWeek} spaceUrl={movieOfTheWeekDiscussion?.spaceUrl} podcastLinks={movieOfTheWeekDiscussion?.podcastLinks} discussionDate={movieOfTheWeekDiscussion?.discussionDate} />
          <MoviesAndTVSeries moviesAndTVSeries={moviesAndTVSeries} />
          <Reviews reviews={reviews} />
          <Discussions discussions={discussions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
