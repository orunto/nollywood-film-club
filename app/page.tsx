import { Footer, Nav } from "@/components/custom";
import { MovieOfTheWeek, MoviesAndTVSeries, Reviews, Discussions } from "@/components/sections";
import { getHomepageData } from "@/lib/server-queries";

export default async function Home() {
  const { movieOfTheWeek, moviesAndTVSeries, reviews, discussions } = await getHomepageData();

  return (
    <>
      <Nav />
      <main className="min-h-screen"
      >
        <div className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 gap-15 min-h-screen">
          <MovieOfTheWeek movie={movieOfTheWeek} />
          <MoviesAndTVSeries moviesAndTVSeries={moviesAndTVSeries} />
          <Reviews reviews={reviews} />
          <Discussions discussions={discussions} />
        </div>
      </main>
      <Footer />
    </>
  );
}
