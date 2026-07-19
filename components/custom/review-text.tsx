import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Member reviews are authored and stored as Markdown. We render a deliberately
// small subset — bold, italic, bullet/numbered lists — and nothing else. Raw
// HTML is never parsed (react-markdown's default), and `unwrapDisallowed` turns
// any other construct (headings, links, images, code) into its plain text, so
// there is no injection surface and no need for a sanitizer library.
const ALLOWED_ELEMENTS = ["p", "strong", "em", "ul", "ol", "li", "br"];

interface ReviewTextProps {
  source: string;
  className?: string;
}

export default function ReviewText({ source, className }: ReviewTextProps) {
  return (
    <div className={cn("text-sm font-light leading-relaxed", className)}>
      <ReactMarkdown
        skipHtml
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={{
          // whitespace-pre-line keeps soft line breaks visible, matching how
          // the old plain-text reviews rendered.
          p: ({ children }) => (
            <p className="mb-2 whitespace-pre-line last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
