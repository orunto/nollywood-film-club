import type { Route } from "./+types/movie.$slug";
import { useLoaderData } from "react-router";
import { redirect } from "react-router";
import { appServicesContext } from "../context";
import { getContentDetailData, isCanonicalFor } from "../../services/content-detail";
import ContentDetailsClient from "../../components/sections/content-details-client";
import Footer from "../../components/site/footer";

export const meta: Route.MetaFunction = ({ matches }) => {
  let self: { loaderData?: Route.ComponentProps["loaderData"] } | undefined;
  for (const m of matches) {
    if (m && m.id === "routes/movie.$slug") {
      self = m as unknown as { loaderData?: Route.ComponentProps["loaderData"] };
      break;
    }
  }
  const data = self?.loaderData;
  const item = data?.item;
  if (!data || !item) return [{ title: "Not Found — Nollywood Film Club" }];

  const year = item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;
  const title = `${item.title}${year ? ` (${year})` : ""} — Nollywood Film Club`;

  return [
    { title },
    {
      name: "description",
      content:
        item.synopsis ??
        `${item.title} — ${item.contentType} on Nollywood Film Club.`,
    },
    { tagName: "link", rel: "canonical", href: data.canonicalUrl },
    { property: "og:url", content: data.canonicalUrl },
    { property: "og:title", content: title },
    { property: "og:type", content: "video.movie" },
    {
      property: "og:image",
      content: data.openGraphImageUrl,
    },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: data.openGraphImageUrl },
  ];
};

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const rawParam = params.slug ?? "";

  const data = await getContentDetailData(services.db.publicReads, rawParam);
  if (!data) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  // Legacy UUIDs, wrong-type paths, and stale slugs land on the canonical URL.
  if (!isCanonicalFor(data, rawParam, "/movie")) {
    throw redirect(data.canonicalPath);
  }

  const canonicalUrl = new URL(data.canonicalPath, request.url).href;
  const openGraphImageUrl = new URL(`${data.canonicalPath}/opengraph-image`, request.url);
  if (data.item.posterVersion) {
    openGraphImageUrl.searchParams.set("v", String(data.item.posterVersion));
  }
  return {
    ...data,
    canonicalUrl,
    openGraphImageUrl: openGraphImageUrl.href,
  };
}

export default function MoviePage() {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <main className="min-h-screen">
        <ContentDetailsClient
          movie={data.item}
          userRatings={data.userRatings}
          criticReviews={data.criticReviews}
          related={data.related}
          spaceUrl={data.discussion.spaceUrl}
          podcastLinks={data.discussion.podcastLinks}
          discussionDate={data.discussion.discussionDate}
          episodes={data.episodes}
        />
      </main>
      <Footer />
    </>
  );
}
