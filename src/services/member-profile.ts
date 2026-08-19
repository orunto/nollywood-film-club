import type { FeedReview, PublicProfile, PublicReadRepository } from "../repositories/public-read";

export interface MemberProfileData {
  profile: PublicProfile;
  stats: { total: number; liked: number; okay: number; disliked: number };
  total: number;
  totalPages: number;
  page: number;
  reviews: FeedReview[];
}

const PAGE_SIZE = 12;

// Data for /members/[username]. Resolves the username to a real member and
// gathers their rating stats and paginated ratings. Returns null when the
// username matches nobody, so the route can 404.
export async function getMemberProfileData(
  repository: PublicReadRepository,
  username: string,
  rawPage?: string,
): Promise<MemberProfileData | null> {
  let profile: PublicProfile | null;
  try {
    profile = await repository.getPublicProfile(username);
  } catch {
    return null;
  }
  if (!profile) return null;

  const parsed = Number.parseInt(rawPage ?? "", 10);
  const requested = Number.isNaN(parsed) ? 1 : Math.max(parsed, 1);

  const [stats, total] = await Promise.all([
    repository.getUserRatingStats(profile.id),
    repository.countRatingsByUser(profile.id),
  ]);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const page = Math.min(requested, totalPages);

  let reviews: FeedReview[] = [];
  try {
    reviews = await repository.getRatingsByUser(profile.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
  } catch {
    // A failed page query renders the empty profile state.
  }

  return { profile, stats, total, totalPages, page, reviews };
}