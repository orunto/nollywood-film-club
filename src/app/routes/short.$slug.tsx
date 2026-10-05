import type { Route } from "./+types/short.$slug";
import { useLoaderData } from "react-router";
import { redirect } from "react-router";
import { appServicesContext } from "../context";
import { contentMetadata, getContentDetailData, isCanonicalFor } from "../../services/content-detail";
import { contentOpenGraphObjectKey, posterUrl } from "../../lib/media";
import ContentDetailsClient from "../../components/sections/content-details-client";
import Footer from "../../components/site/footer";
import { pageMeta, routeLoaderData, SITE_URL } from "../../lib/meta";
import JsonLd from "../../components/site/json-ld";
import { contentStructuredData } from "../../lib/structured-data";

export const meta: Route.MetaFunction = ({ matches }) => {
  const data = routeLoaderData<Route.ComponentProps["loaderData"]>(matches, "routes/short.$slug");
  const item = data?.item;
  if (!data || !item) return [{ title: "Not Found — Nollywood Film Club" }];

  const { title, description } = contentMetadata(item);
  return pageMeta({ title, description, path: data.canonicalPath, image: data.openGraphImageUrl, type: "video.movie" });
};

export async function loader({ params, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const rawParam = params.slug ?? "";

  const data = await getContentDetailData(services.db.publicReads, rawParam, "short_film");
  if (!data) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  if (!isCanonicalFor(data, rawParam, "/short")) {
    throw redirect(data.canonicalPath, 301);
  }

  const canonicalUrl = new URL(data.canonicalPath, SITE_URL).href;
  const openGraphObjectKey = contentOpenGraphObjectKey(data.item.id);
  const hasOpenGraphImage = await services.objects.exists(openGraphObjectKey);
  const imagePath = hasOpenGraphImage
    ? `/media/${openGraphObjectKey}?v=${data.item.posterVersion ?? data.item.updatedAt}`
    : data.item.posterImage
      ? posterUrl(data.item.posterImage, { version: data.item.posterVersion })
      : `${data.canonicalPath}/opengraph-image`;
  return {
    ...data,
    canonicalUrl,
    openGraphImageUrl: new URL(imagePath, SITE_URL).href,
  };
}

export default function ShortFilmPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <JsonLd data={contentStructuredData(data.item)} />
      <main className="min-h-screen">
        <ContentDetailsClient
          movie={data.item}
          userRatings={data.userRatings}
          ratingDistribution={data.ratingDistribution}
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
