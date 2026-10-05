import {
  SmileyBlankIcon,
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
} from "@phosphor-icons/react";
import { cn, getRatingLabel } from "../../lib/utils";

// Colour and expression both carry the member's verdict, including legacy votes.
const FACES = {
  10: { Icon: SmileyIcon, className: "text-green-900" },
  5: { Icon: SmileyMehIcon, className: "text-amber-500" },
  0: { Icon: SmileySadIcon, className: "text-red-700" },
} as const;

const NO_RATING = { Icon: SmileyBlankIcon, className: "text-black/30" } as const;

export default function RatingFace({
  rating,
  className,
}: {
  rating: number | null;
  className?: string;
}) {
  const face = rating === null ? NO_RATING : rating >= 7 ? FACES[10] : rating >= 5 ? FACES[5] : FACES[0];
  const label = getRatingLabel(rating);

  return (
    <face.Icon
      weight="fill"
      role="img"
      aria-label={label}
      className={cn("shrink-0", face.className, className)}
    >
      {/* The face is the only thing standing in for the verdict now, so
          hovering has to be able to spell it out. */}
      <title>{label}</title>
    </face.Icon>
  );
}
