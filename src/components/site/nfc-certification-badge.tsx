import { SealCheckIcon } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";

export function NfcCertificationBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-sm border border-green-900 px-1.5 py-0.5 text-xs font-semibold text-green-900", className)}
      title="Editorially approved by Nollywood Film Club"
    >
      <SealCheckIcon weight="fill" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      NFC certified
    </span>
  );
}
