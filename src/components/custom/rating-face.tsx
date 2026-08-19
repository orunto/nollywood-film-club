import {
  SmileyBlankIcon,
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
} from "@phosphor-icons/react";
import { cn, getRatingLabel } from "../../lib/utils";

// One member's verdict on a film. Ratings are stored as 10 / 5 / 0 (see
// db/schema.ts) but a bare number next to a review reads like a mark out of ten
// the member never actually gave — they picked one of three buttons. So show
// the three buttons back: a face per verdict, colour and shape both carrying
// the meaning so it survives a colour-blind reader and a greyscale print.
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
  const face = FACES[rating as keyof typeof FACES] ?? NO_RATING;
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