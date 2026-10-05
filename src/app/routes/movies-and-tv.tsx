import type { Route } from "./+types/movies-and-tv";
import { Suspense } from "react";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import Footer from "../../components/site/footer";
import BrowseContent from "../../components/catalog/browse-content";
import { pageMeta, routeLoaderData } from "../../lib/meta";
import { applyFilters, PAGE_SIZE, parseBrowseParams, searchContent } from "../../lib/browse";
import { paginatedPath } from "../../lib/seo";

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = routeLoaderData<Route.ComponentProps["loaderData"]>(matches, "routes/movies-and-tv");
  return pageMeta({
    title: `Nollywood Movies & TV Reviews${data && data.page > 1 ? ` — Page ${data.page}` : ""} | Nollywood Film Club`,
    description:
      "Browse Nollywood movies, TV series and short films. Compare NFC ratings, read reviews, find streaming links and revisit the club's discussions.",
    path: data?.canonicalPath ?? "/movies-and-tv",
  });
};

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const allContent = await services.db.publicReads.getAllContent();
  const url = new URL(request.url);
  const state = parseBrowseParams(url.searchParams);
  const matching = searchContent(applyFilters(allContent, state.filters), state.query);
  const totalPages = Math.max(Math.ceil(matching.length / PAGE_SIZE), 1);
  const page = Math.min(state.page, totalPages);
  return { allContent, page, canonicalPath: paginatedPath("/movies-and-tv", page, url.search) };
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
