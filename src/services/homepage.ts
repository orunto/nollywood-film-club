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

export async function getHomepageData(
  repository: PublicReadRepository,
  now = new Date(),
) {
  let degraded = false;
  async function readSection<T>(section: string, promise: Promise<T>, fallback: T): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      degraded = true;
      console.error("Homepage read failed", { section, error });
      return fallback;
    }
  }
  const [movieOfTheWeek, moviesAndTVSeries, reviews, discussions] =
    await Promise.all([
      readSection("movieOfTheWeek", repository.getMovieOfTheWeek(), null),
      readSection("moviesAndTVSeries", repository.getMoviesAndTVSeries(), []),
      readSection(
        "reviews",
        repository.getTrendingReviews({ limit: 4, now }),
        [] as FeedReview[],
      ),
      readSection("discussions", repository.getDiscussions({ now }), []),
    ]);

  const movieOfTheWeekDiscussion = movieOfTheWeek
    ? mergeDiscussions(
        await readSection(
          "movieOfTheWeekDiscussion",
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
    degraded,
  };
}
