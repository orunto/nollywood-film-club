import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Footer } from "@/components/custom";
import MigrationNotice from "@/components/custom/migration-notice";
import ReviewCard from "@/components/custom/review-card";
import RegularBadge from "@/components/custom/regular-badge";
import { EmptyReviewsIllustration } from "@/components/graphics";
import {
  countRatingsByUser,
  getPublicProfile,
  getRatingsByUser,
  getUserRatingStats,
  isDatabaseAvailable,
} from "@/lib/server-queries";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Member not found | Nollywood Film Club" };

  const label = profile.displayName || profile.username;
  return {
    title: `${label} | Nollywood Film Club`,
    description: `${label}'s reviews on Nollywood Film Club.`,
  };
}

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;

  if (!(await isDatabaseAvailable())) return <MigrationNotice />;

  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const { page: rawPage } = await searchParams;
  const parsed = parseInt(rawPage ?? "", 10);
  const requested = Number.isNaN(parsed) ? 1 : Math.max(parsed, 1);

  const [stats, total] = await Promise.all([
    getUserRatingStats(profile.id),
    countRatingsByUser(profile.id),
  ]);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const page = Math.min(requested, totalPages);

  const reviews = await getRatingsByUser(profile.id, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const label = profile.displayName || profile.username || "Member";
  const initial = label.charAt(0).toUpperCase();
  // Uses the route param, not profile.username: this page only resolves
  // when the param matched a real username, so they're equivalent here, but
  // the param is what the visitor actually navigated with.
  const basePath = `/members/${username}`;
  const pageHref = (target: number) => (target <= 1 ? basePath : `${basePath}?page=${target}`);

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
                  <dt className="text-xs uppercase tracking-widest text-white/50">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
          {reviews.length > 0 ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

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
