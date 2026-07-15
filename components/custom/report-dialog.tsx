"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { REPORT_REASONS, type ReportReason, type ReportTarget } from "@/lib/pushback";

interface ReportDialogProps {
  targetType: ReportTarget;
  targetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NOUN: Record<ReportTarget, string> = {
  review: "review",
  pushback: "pushback",
};

export default function ReportDialog({
  targetType,
  targetId,
  open,
  onOpenChange,
}: ReportDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setIsSending(true);
    try {
      const response = await fetch("/api/user/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, note }),
      });
      const result = await response.json();

      if (response.status === 401) {
        toast.error("Sign in first. Anonymous reports are just complaining.");
        router.push("/auth");
        return;
      }
      if (!result.success) {
        toast.error(result.error || "Could not send that report");
        return;
      }

      toast.success(result.message);
      onOpenChange(false);
      setReason("");
      setNote("");
    } catch (error) {
      console.error("Error reporting:", error);
      toast.error("Could not send that report. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {NOUN[targetType]}</DialogTitle>
          <DialogDescription className="text-black/60">
            Disagreeing is the entire point of the club. This is for the other thing.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={reason}
          onValueChange={(value) => setReason(value as ReportReason)}
          className="gap-3 py-2"
        >
          {REPORT_REASONS.map((option) => (
            <div key={option.value} className="flex items-center gap-3">
              <RadioGroupItem
                value={option.value}
                id={`reason-${targetId}-${option.value}`}
                className="border-black/40 text-black"
              />
              <Label
                htmlFor={`reason-${targetId}-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything the admins should know? (optional)"
          className="rounded-sm border-black/40 shadow-none focus-visible:border-black focus-visible:ring-black/20"
          rows={3}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-sm border-black/40 shadow-none"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!reason || isSending}
            className="rounded-sm bg-black text-white hover:bg-black/80"
          >
            {isSending ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
