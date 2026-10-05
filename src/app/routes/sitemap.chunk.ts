import type { Route } from "./+types/sitemap.chunk";
import { appServicesContext } from "../context";
import { SITEMAP_PAGE_SIZE, sitemapResponse } from "../../lib/seo";

export async function loader({ params, context }: Route.LoaderArgs) {
  const { kind, page } = params;
  const match = /^([1-9]\d*)\.xml$/.exec(page ?? "");
  const pageNumber = Number(match?.[1]);
  if ((kind !== "content" && kind !== "reviews") || !match ||
    !Number.isSafeInteger(pageNumber) || !Number.isSafeInteger((pageNumber - 1) * SITEMAP_PAGE_SIZE)) {
    throw new Response("Not Found", { status: 404 });
  }
  const repository = context.get(appServicesContext).db.publicReads;
  const entries = await repository.getSitemapEntries(kind, SITEMAP_PAGE_SIZE, (pageNumber - 1) * SITEMAP_PAGE_SIZE);
  if (entries.length === 0) throw new Response("Not Found", { status: 404 });
  return sitemapResponse(entries);
}
