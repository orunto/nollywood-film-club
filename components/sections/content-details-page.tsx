import { requireContentAt } from "@/lib/content-route";
import {
  getDiscussionForContent,
  getRelatedContent,
  getReviewsForContent,
  getUserRatingsForContent,
} from "@/lib/server-queries";
import ContentDetailsClient from "@/components/sections/content-details-client";
import { Footer } from "@/components/custom";

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

  const [userRatings, discussion, criticReviews, related] = await Promise.all([
    getUserRatingsForContent(item.id),
    getDiscussionForContent(item.id),
    getReviewsForContent(item.id),
    getRelatedContent(item),
  ]);

  return (
    <>
      <main className="min-h-screen">
        <ContentDetailsClient
          movie={item} 
          userRatings={userRatings}
          criticReviews={criticReviews}
          related={related}
          spaceUrl={discussion?.spaceUrl}
          podcastLinks={discussion?.podcastLinks}
          discussionDate={discussion?.discussionDate}
        />
      </main>
      <Footer />
    </>
  );
}
