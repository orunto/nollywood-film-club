import { SITEMAP_STATIC_PATHS, sitemapResponse } from "../../lib/seo";

export function loader() {
  return sitemapResponse(SITEMAP_STATIC_PATHS.map((path) => ({ path })));
}
