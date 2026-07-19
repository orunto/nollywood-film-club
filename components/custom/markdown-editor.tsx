"use client";
import { useRef, useState } from "react";
import {
  TextBIcon,
  TextItalicIcon,
  ListBulletsIcon,
  ListNumbersIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import ReviewText from "./review-text";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}

// A lightweight Markdown editor: a textarea with a formatting toolbar that
// inserts Markdown around the current selection, plus a live Preview tab that
// renders through the same <ReviewText> used on public surfaces. Deliberately
// not a WYSIWYG — storage stays plain Markdown text.
export default function MarkdownEditor({
  value,
  onChange,
  disabled,
  maxLength,
  placeholder,
}: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  const commit = (next: string) => {
    onChange(maxLength ? next.slice(0, maxLength) : next);
  };

  // Wrap the current selection (or insert an empty pair at the caret) and keep
  // the inner text selected so a second click toggles cleanly.
  const surround = (marker: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    commit(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + marker.length;
      el.selectionEnd = start + marker.length + selected.length;
    });
  };

  // Prefix every line touched by the selection (for bullet / numbered lists).
  const prefixLines = (makePrefix: (index: number) => string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = value.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? value.length : nextNewline;
    const block = value.slice(lineStart, lineEnd);
    const prefixed = block
      .split("\n")
      .map((line, i) => makePrefix(i) + line)
      .join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
    commit(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = lineStart;
      el.selectionEnd = lineStart + prefixed.length;
    });
  };

  const tools = [
    { label: "Bold", Icon: TextBIcon, run: () => surround("**") },
    { label: "Italic", Icon: TextItalicIcon, run: () => surround("*") },
    { label: "Bullet list", Icon: ListBulletsIcon, run: () => prefixLines(() => "- ") },
    { label: "Numbered list", Icon: ListNumbersIcon, run: () => prefixLines((i) => `${i + 1}. `) },
  ];

  const overLimit = maxLength !== undefined && value.length >= maxLength;

  return (
    <div className="rounded-sm border border-black/10">
      {/* Toolbar + Write/Preview toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-black/10 px-2 py-1.5">
        <div className="flex items-center gap-1">
          {tools.map(({ label, Icon, run }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              title={label}
              disabled={disabled || tab === "preview"}
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
              className="rounded-sm p-1.5 text-black/70 transition-colors hover:bg-black/5 hover:text-black disabled:opacity-40"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-sm px-2 py-1 capitalize transition-colors",
                tab === t ? "bg-black text-white" : "text-black/60 hover:bg-black/5",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => commit(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          rows={5}
          placeholder={placeholder}
          className="min-h-32 w-full resize-y rounded-none border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-black/40 disabled:cursor-not-allowed disabled:opacity-50 lg:text-base"
        />
      ) : (
        <div className="min-h-32 px-3 py-2">
          {value.trim() ? (
            <ReviewText source={value} />
          ) : (
            <p className="text-sm text-black/40">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {maxLength !== undefined && (
        <div className="flex justify-end px-2 pb-1.5">
          <span className={cn("text-xs", overLimit ? "text-destructive" : "text-black/40")}>
            {value.length}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
