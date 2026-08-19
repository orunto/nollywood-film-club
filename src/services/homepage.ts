import type {
  Discussion,
  FeedReview,
  PublicReadRepository,
} from "../repositories/public-read";

export function mergeDiscussions(list: Discussion[]) {
  if (list.length === 0) {
    return { spaceUrl: null, podcastLinks: null, discussionDate: null };
  }

  const podcastLinks = [
    ...new Set(list.flatMap((discussion) => discussion.podcastLinks ?? [])),
  ];
  const dates = list
    .map((discussion) => discussion.discussionDate)
    .filter((date): date is string => Boolean(date))
    .sort();

  return {
    spaceUrl: list.find((discussion) => discussion.spaceUrl)?.spaceUrl ?? null,
    podcastLinks: podcastLinks.length > 0 ? podcastLinks : null,
    discussionDate: dates[0] ?? null,
  };
}

async function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export async function getHomepageData(
  repository: PublicReadRepository,
  now = new Date(),
) {
  const [movieOfTheWeek, moviesAndTVSeries, reviews, discussions] =
    await Promise.all([
      withFallback(repository.getMovieOfTheWeek(), null),
      withFallback(repository.getMoviesAndTVSeries(), []),
      withFallback(
        repository.getTrendingReviews({ limit: 4, now }),
        [] as FeedReview[],
      ),
      withFallback(repository.getDiscussions({ now }), []),
    ]);

  const movieOfTheWeekDiscussion = movieOfTheWeek
    ? mergeDiscussions(
        await withFallback(
          repository.getDiscussionsForContent(movieOfTheWeek.id),
          [],
        ),
      )
    : null;

  return {
    movieOfTheWeek,
    movieOfTheWeekDiscussion,
    moviesAndTVSeries,
    reviews,
    discussions,
  };
}
