import { cn, nfcPercent, scoreBadgeClass } from "@/lib/utils";

// The NFC score chip — the average of every member's rating on a film, shown as
// a percentage (see nfcPercent). Individual members get a face instead
// (RatingFace); this is aggregate-only, so it is the one place a number is
// still the right answer.
export default function ScoreBox({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  const percent = nfcPercent(score);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-sm font-semibold text-white leading-none",
        percent === null ? "text-xs" : "text-xl",
        scoreBadgeClass(score),
        className,
      )}
    >
      {percent === null ? "N/A" : `${percent}%`}
    </div>
  );
}
