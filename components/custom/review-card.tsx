"use client";
import { useState } from "react";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { ChatCircleIcon, DotsThreeIcon, FlagIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, contentPath, contentTypeLabel } from "@/lib/utils";
import type { FeedReview } from "@/lib/server-queries";
import ScoreBox from "./score-box";
import ReportDialog from "./report-dialog";

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
        "flex flex-col gap-4 rounded-sm bg-black/5 p-5",
        className,
      )}
    >
      {/* The feed spans the catalogue, so each take carries its film with it */}
      {film && filmHref && (
        <Link href={filmHref} className="flex items-center gap-3 group w-fit">
          {film.posterImage && (
            <CldImage
              src={film.posterImage}
              alt=""
              width={64}
              height={96}
              className="h-16 w-11 shrink-0 rounded-sm object-cover"
              sizes="44px"
              loading="lazy"
            />
          )}
          <div className="flex flex-col gap-1">
            <span className="font-semibold leading-tight group-hover:underline">
              {film.title} {year && <span className="text-black/40">({year})</span>}
            </span>
            <Badge className="w-fit border border-black bg-transparent text-xs text-black">
              {contentTypeLabel(film.contentType)}
            </Badge>
          </div>
        </Link>
      )}

      <div className="flex items-center gap-3">
        <ScoreBox score={review.rating} className="h-12 w-12 shrink-0 rounded-full text-lg" />
        <div className="flex flex-col">
          <span className="font-semibold">{review.username}</span>
          <span className="text-xs uppercase tracking-widest text-black/50">
            {formatWhen(review.createdAt)}
            {review.edited && <span className="normal-case tracking-normal"> (edited)</span>}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Review options"
              className="ml-auto self-start text-black/40 hover:text-black cursor-pointer"
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

      {review.review && (
        <p
          className={cn(
            "text-sm font-light leading-relaxed whitespace-pre-line",
            !expanded && "line-clamp-4",
          )}
        >
          {review.review}
        </p>
      )}

      {!expanded && (
        <Link
          href={`/reviews/${review.id}`}
          className="flex w-fit items-center gap-1.5 text-xs text-black/50 hover:text-black"
        >
          <ChatCircleIcon className="h-4 w-4" />
          {review.pushbackCount === 0
            ? "Push back"
            : `${review.pushbackCount} pushback${review.pushbackCount === 1 ? "" : "s"}`}
        </Link>
      )}

      <ReportDialog
        targetType="review"
        targetId={review.id}
        open={isReporting}
        onOpenChange={setIsReporting}
      />
    </article>
  );
}
