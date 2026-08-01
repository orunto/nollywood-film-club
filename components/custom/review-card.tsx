"use client";
import { useState } from "react";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { DotsThreeIcon, FlagIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, contentPath, contentTypeLabel, markdownToPlainText } from "@/lib/utils";
import type { FeedReview } from "@/lib/server-queries";
import RatingFace from "./rating-face";
import ReportDialog from "./report-dialog";
import ReviewText from "./review-text";
import CommentSheet from "./comment-sheet";
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
  const [isReporting, setIsReporting] = useState(false);
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
                href={`/members/${review.profileUsername}`}
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
                href={`/reviews/${review.id}`}
                className="text-xs text-black/50 hover:text-black hover:underline"
              >
                {formatWhen(review.createdAt)}
                {review.edited && <span> (edited)</span>}
              </Link>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Review options"
                className="shrink-0 text-black/40 hover:text-black cursor-pointer"
              >
                <DotsThreeIcon className="h-5 w-5" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-sm">
              <DropdownMenuItem onClick={() => setIsReporting(true)} className="cursor-pointer">
                <FlagIcon className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            href={filmHref}
            className="flex w-fit max-w-full items-center gap-3 rounded-sm border border-black/15 p-2.5 transition-colors hover:border-black hover:bg-black/[0.03]"
          >
            {film.posterImage && (
              <CldImage
                src={film.posterImage}
                alt=""
                width={64}
                height={96}
                className="h-14 w-10 shrink-0 rounded-sm object-cover"
                sizes="40px"
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

        {!expanded && (
          <CommentSheet
            reviewId={review.id}
            count={review.commentCount}
            review={{
              username: review.username ?? "Member",
              rating: review.rating,
              body: review.review,
            }}
          />
        )}
      </div>

      <ReportDialog
        targetType="review"
        targetId={review.id}
        open={isReporting}
        onOpenChange={setIsReporting}
      />
    </article>
  );
}
