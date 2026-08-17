import { Link } from "react-router";
import { Badge } from "../ui/badge";
import { cn, contentPath, contentTypeLabel, markdownToPlainText } from "../../lib/utils";
import type { FeedReview } from "../../repositories/public-read";
import { posterUrl } from "../../lib/media";
import RatingFace from "./rating-face";
import ReviewText from "./review-text";
import RegularBadge from "./regular-badge";

const formatWhen = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

interface ReviewCardProps {
  review: FeedReview;
  // Detail view drops the body clamp and the permalink affordance
  expanded?: boolean;
  className?: string;
}

export default function ReviewCard({ review, expanded, className }: ReviewCardProps) {
  const { film } = review;

  const year = film?.releaseDate ? new Date(film.releaseDate).getUTCFullYear() : null;
  const filmHref = film
    ? contentPath({
        contentType: film.contentType,
        title: film.title,
        releaseDate: film.releaseDate,
      })
    : null;

  return (
    <article
      className={cn(
        "group flex gap-3 sm:gap-4",
        // Feed rows get the site's list-row treatment (see episode-row.tsx):
        // negative margin lets the hover fill bleed past the text padding.
        !expanded && "-mx-3 rounded-sm px-3 py-5 transition-colors hover:bg-black/[0.03] sm:-mx-4 sm:px-4",
        className,
      )}
    >
      {/* No profile photos on this site — the verdict a member gave stands in
          for their avatar, the same face shown everywhere else they rate. */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/5 ring-1 ring-black/10 sm:h-12 sm:w-12">
        <RatingFace rating={review.rating} className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-0.5">
            {review.profileUsername ? (
              <Link
                to={`/members/${review.profileUsername}`}
                className="truncate font-semibold hover:underline"
              >
                {review.username}
              </Link>
            ) : (
              <span className="truncate font-semibold">{review.username}</span>
            )}
            {review.isRegular && <RegularBadge />}
            <span aria-hidden className="text-black/30">
              &middot;
            </span>
            {expanded ? (
              <span className="text-xs text-black/50">
                {formatWhen(review.createdAt)}
                {review.edited && <span> (edited)</span>}
              </span>
            ) : (
              // The timestamp is the permalink, the way a tweet's is.
              <Link
                to={`/reviews/${review.id}`}
                className="text-xs text-black/50 hover:text-black hover:underline"
              >
                {formatWhen(review.createdAt)}
                {review.edited && <span> (edited)</span>}
              </Link>
            )}
          </div>
        </div>

        {review.review &&
          (expanded ? (
            // Full Markdown on the permalink / detail view.
            <ReviewText source={review.review} />
          ) : (
            // Collapsed feed card: clamp a plain-text excerpt so line-clamp stays
            // clean across Markdown block elements.
            <p className="text-sm font-light leading-relaxed line-clamp-4">
              {markdownToPlainText(review.review)}
            </p>
          ))}

        {/* The film rides along like a quoted link: what's being talked about,
            not who's talking. */}
        {film && filmHref && (
          <Link
            to={filmHref}
            className="flex w-fit max-w-full items-center gap-3 rounded-sm border border-black/15 p-2.5 transition-colors hover:border-black hover:bg-black/[0.03]"
          >
            {film.posterImage && (
              <img
                src={posterUrl(film.posterImage, { width: 64, height: 96 })}
                alt=""
                className="h-14 w-10 shrink-0 rounded-sm object-cover"
                loading="lazy"
              />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium leading-tight">
                {film.title} {year && <span className="text-black/40">({year})</span>}
              </span>
              <Badge className="w-fit border border-black/20 bg-transparent text-[10px] text-black/70">
                {contentTypeLabel(film.contentType)}
              </Badge>
            </div>
          </Link>
        )}
      </div>
    </article>
  );
}