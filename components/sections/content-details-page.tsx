import { requireContentAt } from "@/lib/content-route";
import {
  getDiscussionForContent,
  getUserRatingsForContent,
} from "@/lib/server-queries";
import ContentDetailsClient from "@/components/sections/content-details-client";

interface ContentDetailsPageProps {
  rawParam: string;
  basePath: "/movie" | "/tv" | "/short";
}

// Shared server component behind /movie/[slug], /tv/[slug] and /short/[slug]
export default async function ContentDetailsPage({
  rawParam,
  basePath,
}: ContentDetailsPageProps) {
  const item = await requireContentAt(rawParam, basePath);

  const [userRatings, discussion] = await Promise.all([
    getUserRatingsForContent(item.id),
    getDiscussionForContent(item.id),
  ]);

  return (
    <ContentDetailsClient
      movie={item}
      userRatings={userRatings}
      spaceUrl={discussion?.spaceUrl}
      podcastLinks={discussion?.podcastLinks}
    />
  );
}
