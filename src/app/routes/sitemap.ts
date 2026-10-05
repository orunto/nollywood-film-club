import type { Route } from "./+types/sitemap";
import { appServicesContext } from "../context";
import { SITEMAP_PAGE_SIZE, sitemapResponse } from "../../lib/seo";

export async function loader({ context }: Route.LoaderArgs) {
  const repository = context.get(appServicesContext).db.publicReads;
  const counts = await repository.getSitemapCounts();
  const entries = [{ path: "/sitemaps/pages.xml" }];
  for (const kind of ["content", "reviews"] as const) {
    const pages = Math.ceil(counts[kind] / SITEMAP_PAGE_SIZE);
    for (let page = 1; page <= pages; page++) {
      entries.push({ path: `/sitemaps/${kind}/${page}.xml` });
    }
  }
  return sitemapResponse(entries, true);
}
