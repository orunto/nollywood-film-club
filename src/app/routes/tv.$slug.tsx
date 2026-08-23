import type { Route } from "./+types/tv.$slug";
import { useLoaderData } from "react-router";
import { redirect } from "react-router";
import { appServicesContext } from "../context";
import { getContentDetailData, isCanonicalFor } from "../../services/content-detail";
import { posterUrl } from "../../lib/media";
import ContentDetailsClient from "../../components/sections/content-details-client";
import Footer from "../../components/site/footer";

export const meta: Route.MetaFunction = ({ matches }) => {
  let self: { loaderData?: Route.ComponentProps["loaderData"] } | undefined;
  for (const m of matches) {
    if (m && m.id === "routes/tv.$slug") {
      self = m as unknown as { loaderData?: Route.ComponentProps["loaderData"] };
      break;
    }
  }
  const data = self?.loaderData;
  const item = data?.item;
  if (!data || !item) return [{ title: "Not Found — Nollywood Film Club" }];

  const year = item.releaseDate ? new Date(item.releaseDate).getUTCFullYear() : null;
  const title = `${item.title}${year ? ` (${year})` : ""} — Nollywood Film Club`;
  const description =
    item.synopsis ?? `${item.title} — ${item.contentType} on Nollywood Film Club.`;

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: data.canonicalUrl },
    { property: "og:description", content: description },
    { property: "og:url", content: data.canonicalUrl },
    { property: "og:title", content: title },
    {
      property: "og:image",
      content: data.openGraphImageUrl,
    },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: data.openGraphImageUrl },
    { name: "twitter:title", content: title },
  ];
};

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const rawParam = params.slug ?? "";

  const data = await getContentDetailData(services.db.publicReads, rawParam);
  if (!data) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  if (!isCanonicalFor(data, rawParam, "/tv")) {
    throw redirect(data.canonicalPath);
  }

  const canonicalUrl = new URL(data.canonicalPath, request.url).href;
  const imagePath = data.item.posterImage
    ? posterUrl(data.item.posterImage, { version: data.item.posterVersion })
    : `${data.canonicalPath}/opengraph-image`;
  return {
    ...data,
    canonicalUrl,
    openGraphImageUrl: new URL(imagePath, request.url).href,
  };
}

export default function TvPage() {
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
