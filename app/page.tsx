import { Footer, Nav } from "@/components/custom";
import { Hero, MovieOfTheWeek, MoviesAndTVSeries, Reviews, Discussions } from "@/components/sections";
import { getHomepageData, getAllContent } from "@/lib/server-queries";

export default async function Home() {
  const [{ movieOfTheWeek, movieOfTheWeekDiscussion, moviesAndTVSeries, reviews, discussions }, allContent] =
    await Promise.all([getHomepageData(), getAllContent()]);

  // Feature the newest episode that has a Spotify link in the hero player,
  // falling back to the latest discussion overall (discussions are newest-first).
  const latestEpisode =
    discussions.find((d) => d.podcastLinks?.some((l) => l.includes("spotify"))) ??
    discussions[0] ??
    null;

  // Every catalogue poster feeds the hero's moving poster-wall background.
  const posters = allContent
    .map((item) => item.posterImage)
    .filter((src): src is string => Boolean(src));

  return (
    <>
      <Nav />
      <main className="min-h-screen">
        <Hero latestEpisode={latestEpisode} posters={posters} />
        <div className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 gap-15">
          <MovieOfTheWeek movie={movieOfTheWeek} spaceUrl={movieOfTheWeekDiscussion?.spaceUrl} podcastLinks={movieOfTheWeekDiscussion?.podcastLinks} />
          <MoviesAndTVSeries moviesAndTVSeries={moviesAndTVSeries} />
          <Reviews reviews={reviews} />
          <Discussions discussions={discussions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
