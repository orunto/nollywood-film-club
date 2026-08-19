import type { Route } from "./+types/members.$username";
import { useLoaderData } from "react-router";
import { appServicesContext } from "../context";
import Footer from "../../components/site/footer";
import ReviewCard from "../../components/custom/review-card";
import RatingTile from "../../components/custom/rating-tile";
import RegularBadge from "../../components/custom/regular-badge";
import { EmptyReviewsIllustration } from "../../components/graphics/empty-states";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { getMemberProfileData } from "../../services/member-profile";

export const meta: Route.MetaFunction = ({ matches }) => {
  let self: { loaderData?: Route.ComponentProps["loaderData"] } | undefined;
  for (const m of matches) {
    if (m && m.id === "routes/members.$username") {
      self = m as unknown as { loaderData?: Route.ComponentProps["loaderData"] };
      break;
    }
  }
  const data = self?.loaderData;
  if (!data) return [{ title: "Member not found | Nollywood Film Club" }];
  const label = data.profile.displayName || data.profile.username;
  return [
    { title: `${label} | Nollywood Film Club` },
    { name: "description", content: `${label}'s reviews on Nollywood Film Club.` },
  ];
};

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const url = new URL(request.url);
  const username = params.username ?? "";

  const data = await getMemberProfileData(
    services.db.publicReads,
    username,
    url.searchParams.get("page") ?? "",
  );
  if (!data) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }

  return data;
}

export default function MemberProfilePage() {
  const data = useLoaderData<typeof loader>();
  const { profile, stats, totalPages, page, reviews } = data;

  // A score-only rating has no text to carry a review card, so it gets a
  // lighter poster-tile treatment instead — split once, render separately.
  const writtenReviews = reviews.filter((review) => review.review);
  const bareRatings = reviews.filter((review) => !review.review);

  const label = profile.displayName || profile.username || "Member";
  const initial = label.charAt(0).toUpperCase();
  const username = profile.username ?? "";
  const pageHref = (target: number) =>
    target <= 1 ? `/members/${username}` : `/members/${username}?page=${target}`;

  return (
    <>
      <div className="min-h-screen bg-white">
        <header className="w-full bg-black text-white">
          <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center lg:px-10">
            <Avatar className="size-16 border border-white/20">
              {profile.profileImage && <AvatarImage src={profile.profileImage} alt={label} />}
              <AvatarFallback className="bg-white text-xl font-medium text-black">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{label}</h1>
                {profile.isRegular && <RegularBadge />}
              </div>
              {profile.username && <p className="text-sm text-white/60">@{profile.username}</p>}
            </div>
            <dl className="flex gap-6">
              {[
                { n: stats.total, label: "reviews" },
                { n: stats.liked, label: "liked" },
                { n: stats.okay, label: "okay" },
                { n: stats.disliked, label: "disliked" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <dd className="text-2xl font-semibold">{stat.n}</dd>
                  <dt className="text-xs uppercase tracking-widest text-white/50">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
          {reviews.length > 0 ? (
            <>
              {writtenReviews.length > 0 && (
                <div className="mx-auto flex w-full max-w-2xl flex-col divide-y divide-black/10">
                  {writtenReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              )}

              {bareRatings.length > 0 && (
                <div className={writtenReviews.length > 0 ? "pt-10" : undefined}>
                  <h2 className="pb-4 text-lg font-semibold">Also rated</h2>
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                    {bareRatings.map((review) => (
                      <RatingTile key={review.id} review={review} />
                    ))}
                  </div>
                </div>
              )}

              {totalPages > 1 && (
                <Pagination className="pt-10">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href={pageHref(page - 1)}
                        aria-disabled={page === 1}
                        className={page === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink href={pageHref(p)} isActive={p === page}>
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href={pageHref(page + 1)}
                        aria-disabled={page === totalPages}
                        className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <EmptyReviewsIllustration className="w-40" />
              <h2 className="text-xl font-semibold">No reviews yet</h2>
              <p className="max-w-md text-sm font-light text-black/60">
                {label} hasn&apos;t rated anything yet.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}