import { requireContentAt } from "@/lib/content-route";
import {
  getDiscussionsForContent,
  getRelatedContent,
  getReviewsForContent,
  getUserRatingsForContent,
  isDatabaseAvailable,
  mergeDiscussions,
} from "@/lib/server-queries";
import ContentDetailsClient from "@/components/sections/content-details-client";
import { Footer } from "@/components/custom";
import MigrationNotice from "@/components/custom/migration-notice";

interface ContentDetailsPageProps {
  rawParam: string;
  basePath: "/movie" | "/tv" | "/short";
}

// Shared server component behind /movie/[slug], /tv/[slug] and /short/[slug]
export default async function ContentDetailsPage({
  rawParam,
  basePath,
}: ContentDetailsPageProps) {
  if (!(await isDatabaseAvailable())) return <MigrationNotice />;

  const item = await requireContentAt(rawParam, basePath);

  const [userRatings, episodes, criticReviews, related] = await Promise.all([
    getUserRatingsForContent(item.id),
    getDiscussionsForContent(item.id),
    getReviewsForContent(item.id),
    getRelatedContent(item),
  ]);

  // Flattened here rather than in the client component, so the hero and the
  // detail page keep taking the same three scalars they always have.
  const { spaceUrl, podcastLinks, discussionDate } = mergeDiscussions(episodes);

  return (
    <>
      <main className="min-h-screen">
        <ContentDetailsClient
          movie={item}
          userRatings={userRatings}
          criticReviews={criticReviews}
          related={related}
          spaceUrl={spaceUrl}
          podcastLinks={podcastLinks}
          discussionDate={discussionDate}
          episodes={episodes}
        />
      </main>
      <Footer />
    </>
  );
}
