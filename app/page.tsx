import { MovieOfTheWeek, PastSpaces, Reviews } from "@/components/sections";
import { getHomepageData } from "@/lib/server-queries";

export default async function Home() {
  const { movieOfTheWeek, pastSpaces, reviews } = await getHomepageData();

  return (
    <div className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 gap-15 min-h-screen">
      <MovieOfTheWeek movie={movieOfTheWeek} />
      <PastSpaces pastSpaces={pastSpaces} />
      <Reviews reviews={reviews} />
    </div>
  );
}
