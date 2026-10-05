import { expect, test } from "@playwright/test";

test("SEO resources and structured data are present in server responses", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain("Sitemap: https://nollywoodfilm.club/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("application/xml");
  const index = await sitemap.text();
  expect(index).toContain("<sitemapindex");
  expect(index).toContain("https://nollywoodfilm.club/sitemaps/pages.xml");
  const pages = await request.get("/sitemaps/pages.xml");
  expect(pages.status()).toBe(200);
  expect(await pages.text()).not.toContain("/auth");

  const auth = await request.get("/auth", { headers: { "User-Agent": "Googlebot" } });
  expect(auth.status()).toBe(200);
  expect(auth.headers()["x-robots-tag"]).toBe("noindex, follow");
  expect(await auth.text()).toContain('<meta name="robots" content="noindex, follow"');

  const home = await request.get("/", { headers: { "User-Agent": "Googlebot" } });
  expect(home.status()).toBe(200);
  expect(home.headers()["x-robots-tag"]).toBeUndefined();
  const homeHtml = await home.text();
  const homeJson = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(homeHtml);
  expect(homeJson).not.toBeNull();
  expect(JSON.parse(homeJson![1])["@graph"].map((node: { "@type": string }) => node["@type"]))
    .toEqual(["Organization", "WebSite"]);

  const search = await request.get("/movies-and-tv?q=film", { headers: { "User-Agent": "Googlebot" } });
  expect(search.status()).toBe(200);
  expect(search.headers()["x-robots-tag"]).toBe("noindex, follow");
  const browse = await request.get("/movies-and-tv?page=2", { headers: { "User-Agent": "Googlebot" } });
  expect(browse.status()).toBe(200);
  expect(browse.headers()["x-robots-tag"]).toBeUndefined();
  const browseHtml = await browse.text();
  const hasSecondPage = /href="[^\"]*page=2"/.test(browseHtml);
  expect(browseHtml).toContain(`rel="canonical" href="https://nollywoodfilm.club/movies-and-tv${hasSecondPage ? "?page=2" : ""}"`);

  if (index.includes("/sitemaps/content/1.xml")) {
    const catalogue = await request.get("/sitemaps/content/1.xml");
    expect(catalogue.status()).toBe(200);
    const entry = /<loc>([^<]+)<\/loc>/.exec(await catalogue.text());
    expect(entry).not.toBeNull();
    const film = await request.get(new URL(entry![1]).pathname, { headers: { "User-Agent": "Googlebot" } });
    expect(film.status()).toBe(200);
    const filmHtml = await film.text();
    expect(filmHtml).toContain(`rel="canonical" href="${entry![1]}"`);
    const filmJson = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(filmHtml);
    expect(filmJson).not.toBeNull();
    const graph = JSON.parse(filmJson![1])["@graph"];
    expect(["Movie", "TVSeries"]).toContain(graph[0]["@type"]);
    expect(graph[1]["@type"]).toBe("BreadcrumbList");
  }
});
