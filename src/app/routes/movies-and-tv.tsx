import type { Route } from "./+types/movies-and-tv";
import { Suspense } from "react";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import Footer from "../../components/site/footer";
import BrowseContent from "../../components/catalog/browse-content";
import { pageMeta } from "../../lib/meta";

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: "Movies & TV | Nollywood Film Club",
    description:
      "Every movie, TV series, and short film Nollywood Film Club has discussed. Filter by year, streaming service, genre, and the score it earned. The catalogue remembers everything, even the ones we'd rather forget.",
    path: "/movies-and-tv",
  });

export async function loader({ context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const allContent = await services.db.publicReads.getAllContent();
  return { allContent };
}

export default function MoviesAndTVPage() {
  const { allContent } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="min-h-screen">
        <div className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 min-h-screen">
          <section className="w-full">
            <Suspense
              fallback={
                <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6 py-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="rounded-sm border h-80 bg-gray-100 animate-pulse" />
                  ))}
                </div>
              }
            >
              <BrowseContent allContent={allContent} />
            </Suspense>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}