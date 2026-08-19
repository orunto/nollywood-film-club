import type {
  CommentRecord,
  FeedReview,
  PublicReadRepository,
} from "../repositories/public-read";

export interface CommentNode extends CommentRecord {
  replies: CommentNode[];
}

export function assembleCommentTree(rows: CommentRecord[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>(
    rows.map((row) => [row.id, { ...row, replies: [] }]),
  );
  const roots: CommentNode[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    if (!row.parentId) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(row.parentId);
    if (parent) parent.replies.push(node);
  }

  return roots;
}

export async function getReviewThread(
  repository: PublicReadRepository,
  reviewId: string,
): Promise<CommentNode[]> {
  try {
    return assembleCommentTree(
      await repository.getVisibleCommentsForReview(reviewId),
    );
  } catch {
    return [];
  }
}

export async function getReviewPermalinkData(
  repository: PublicReadRepository,
  reviewId: string,
): Promise<{ review: FeedReview; thread: CommentNode[] } | null> {
  let review: FeedReview | null;
  try {
    review = await repository.getFeedReviewById(reviewId);
  } catch {
    return null;
  }
  if (!review) return null;

  return {
    review,
    thread: await getReviewThread(repository, reviewId),
  };
}

export async function getReviewsPage(
  repository: PublicReadRepository,
  rawPage?: string,
  { pageSize = 12, now = new Date() } = {},
) {
  const parsed = Number.parseInt(rawPage ?? "", 10);
  const requested = Number.isNaN(parsed) ? 1 : Math.max(parsed, 1);
  let total = 0;
  try {
    total = await repository.countTrendingReviews();
  } catch {
    // Preserve the legacy empty-feed fallback when the count query fails.
  }
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(requested, totalPages);

  let reviews: FeedReview[] = [];
  try {
    reviews = await repository.getTrendingReviews({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      now,
    });
  } catch {
    // A failed page query renders the existing empty state.
  }

  return { reviews, total, totalPages, page, pageSize };
}
