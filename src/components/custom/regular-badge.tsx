import { SealCheckIcon } from "@phosphor-icons/react";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

// Single visual treatment for a "regular" member, reused on review cards,
// the member profile header, and the About page roster.
export default function RegularBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "gap-1 rounded-sm border-transparent bg-black px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white",
        className,
      )}
    >
      <SealCheckIcon className="h-3 w-3" weight="fill" />
      Regular
    </Badge>
  );
}