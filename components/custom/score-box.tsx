import { cn } from "@/lib/utils";
import { scoreBadgeClass } from "@/lib/utils";

// The member rating chip (10 / 5 / 0, or N/A when someone reviewed without
// rating). Shared by the film detail page and the review feed so a member's
// score reads identically wherever it appears.
export default function ScoreBox({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-sm font-semibold text-white",
        score === null ? "text-xs" : "text-2xl",
        scoreBadgeClass(score),
        className,
      )}
    >
      {score ?? "N/A"}
    </div>
  );
}
