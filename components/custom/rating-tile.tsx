"use client";
import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { contentPath } from "@/lib/utils";
import type { FeedReview } from "@/lib/server-queries";
import RatingFace from "./rating-face";

interface RatingTileProps {
  review: FeedReview;
}

// A score-only rating: no text, so it doesn't earn a review card — just the
// poster and the verdict, letterboxd's "logged but didn't write anything" tile.
export default function RatingTile({ review }: RatingTileProps) {
  const { film } = review;
  if (!film) return null;

  const year = film.releaseDate ? new Date(film.releaseDate).getUTCFullYear() : null;
  const href = contentPath({
    contentType: film.contentType,
    title: film.title,
    releaseDate: film.releaseDate,
  });

  return (
    <Link href={href} className="group flex flex-col gap-2">
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-sm bg-black/5">
        {film.posterImage && (
          <CldImage
            src={film.posterImage}
            alt=""
            fill
            className="object-cover transition-opacity group-hover:opacity-80"
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 160px"
            loading="lazy"
          />
        )}
        <div className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-black/10">
          <RatingFace rating={review.rating} className="h-4 w-4" />
        </div>
      </div>
      <span className="truncate text-xs font-medium leading-tight group-hover:underline">
        {film.title} {year && <span className="text-black/40">({year})</span>}
      </span>
    </Link>
  );
}
