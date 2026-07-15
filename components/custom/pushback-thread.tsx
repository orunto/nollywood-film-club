"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatCircleIcon, DotsThreeIcon, FlagIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MAX_PUSHBACK_DEPTH,
  MAX_PUSHBACK_INDENT,
  MAX_PUSHBACK_LENGTH,
} from "@/lib/pushback";
import type { PushbackNode } from "@/lib/server-queries";
import ReportDialog from "./report-dialog";

const formatWhen = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

// Shared composer: posts pushback on the review, or a reply to another
// pushback when parentId is set.
function Composer({
  reviewId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
  onCancel,
}: {
  reviewId: string;
  parentId?: string | null;
  placeholder: string;
  autoFocus?: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setIsSending(true);
    try {
      const response = await fetch("/api/user/pushbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, parentId: parentId ?? null, body: text }),
      });
      const result = await response.json();

      if (response.status === 401) {
        toast.error("Sign in to push back. Lurking is also valid.");
        router.push("/auth");
        return;
      }
      if (!result.success) {
        toast.error(result.error || "Could not post that");
        return;
      }

      setBody("");
      onDone();
      // Server component owns the thread, so let it refetch rather than
      // duplicating tree-insert logic on the client.
      router.refresh();
      toast.success(result.message);
    } catch (error) {
      console.error("Error posting pushback:", error);
      toast.error("Could not post that. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  const over = body.length > MAX_PUSHBACK_LENGTH;

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        className="rounded-sm border-black/40 shadow-none focus-visible:border-black focus-visible:ring-black/20"
      />
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs", over ? "text-red-700" : "text-black/40")}>
          {body.length}/{MAX_PUSHBACK_LENGTH}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="rounded-sm text-black/60 hover:bg-black/5 hover:text-black"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={submit}
            disabled={!body.trim() || over || isSending}
            className="rounded-sm bg-black text-white hover:bg-black/80"
          >
            {isSending ? "Posting…" : "Push back"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PushbackItem({ node, reviewId }: { node: PushbackNode; reviewId: string }) {
  const [isReplying, setIsReplying] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // The data keeps nesting past this; the layout stops, so deep threads don't
  // squeeze into a column of single letters on a phone.
  const indent = Math.min(node.depth, MAX_PUSHBACK_INDENT);
  const canReply = node.depth < MAX_PUSHBACK_DEPTH;

  return (
    <div
      className={cn(indent > 0 && "border-l border-black/10 pl-4 sm:pl-6")}
      style={indent > 1 ? { marginLeft: 0 } : undefined}
    >
      <article className="flex flex-col gap-2 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{node.username}</span>
          <span className="text-xs text-black/40">{formatWhen(node.createdAt)}</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Pushback options"
                className="ml-auto text-black/40 hover:text-black cursor-pointer"
              >
                <DotsThreeIcon className="h-5 w-5" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-sm">
              <DropdownMenuItem
                onClick={() => setIsReporting(true)}
                className="cursor-pointer"
              >
                <FlagIcon className="mr-2 h-4 w-4" />
                Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm font-light leading-relaxed whitespace-pre-line">{node.body}</p>

        {canReply && (
          <button
            type="button"
            onClick={() => setIsReplying((v) => !v)}
            className="flex w-fit items-center gap-1.5 text-xs text-black/50 hover:text-black cursor-pointer"
          >
            <ChatCircleIcon className="h-4 w-4" />
            Push back
          </button>
        )}

        {isReplying && (
          <div className="pt-2">
            <Composer
              reviewId={reviewId}
              parentId={node.id}
              placeholder={`Push back on ${node.username}…`}
              autoFocus
              onDone={() => setIsReplying(false)}
              onCancel={() => setIsReplying(false)}
            />
          </div>
        )}
      </article>

      {node.replies.length > 0 && (
        <div className="flex flex-col">
          {node.replies.map((reply) => (
            <PushbackItem key={reply.id} node={reply} reviewId={reviewId} />
          ))}
        </div>
      )}

      <ReportDialog
        targetType="pushback"
        targetId={node.id}
        open={isReporting}
        onOpenChange={setIsReporting}
      />
    </div>
  );
}

export default function PushbackThread({
  reviewId,
  thread,
}: {
  reviewId: string;
  thread: PushbackNode[];
}) {
  const total = thread.reduce(function count(sum: number, node): number {
    return sum + 1 + node.replies.reduce(count, 0);
  }, 0);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-black pb-3 text-xl font-semibold">
        Pushback {total > 0 && <span className="text-black/40">({total})</span>}
      </h2>

      <Composer
        reviewId={reviewId}
        placeholder="Disagree with the whole thing. Politely, if you can manage it."
        onDone={() => {}}
      />

      {thread.length > 0 ? (
        <div className="flex flex-col divide-y divide-black/10">
          {thread.map((node) => (
            <PushbackItem key={node.id} node={node} reviewId={reviewId} />
          ))}
        </div>
      ) : (
        <p className="py-6 text-sm text-black/50">
          No pushback yet. Everybody agrees, which has never once happened here.
        </p>
      )}
    </section>
  );
}
