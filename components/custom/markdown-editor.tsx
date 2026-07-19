"use client";
import { useEffect } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  TextBIcon,
  TextItalicIcon,
  ListBulletsIcon,
  ListNumbersIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
}

// tiptap-markdown attaches getMarkdown() to editor.storage.markdown but doesn't
// augment Tiptap's Storage type, so read it through a narrow cast.
const getMarkdown = (editor: { storage: unknown }): string =>
  (editor.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();

// WYSIWYG review editor. Formatting is shown inline (real bold text, real
// lists — never raw "**" markup), but the value read/written is still Markdown
// so the stored format, the <ReviewText> renderer, and existing reviews are
// unchanged. Limited to bold / italic / bullet + numbered lists.
export default function MarkdownEditor({
  value,
  onChange,
  disabled,
  maxLength,
  placeholder,
}: MarkdownEditorProps) {
  const editor = useEditor({
    // Tiptap must render on the client only, or SSR hydration mismatches.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
        link: false,
        underline: false,
      }),
      Markdown.configure({ html: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(getMarkdown(editor)),
    editorProps: {
      attributes: {
        class: "review-editor min-h-32 px-3 py-2 text-sm lg:text-base focus:outline-none",
      },
    },
  });

  // Reflect external value changes (e.g. preloading an existing review) without
  // clobbering in-progress typing — only reset when the markdown truly differs.
  useEffect(() => {
    if (!editor) return;
    if (value !== getMarkdown(editor)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  // useEditorState re-renders the toolbar/counter on selection + doc changes
  // (v3 does not re-render on every transaction otherwise).
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
      bulletList: ctx.editor?.isActive("bulletList") ?? false,
      orderedList: ctx.editor?.isActive("orderedList") ?? false,
      chars: (ctx.editor?.storage.characterCount?.characters() as number | undefined) ?? 0,
    }),
  });

  const tools = [
    {
      label: "Bold",
      Icon: TextBIcon,
      active: state?.bold ?? false,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      Icon: TextItalicIcon,
      active: state?.italic ?? false,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: "Bullet list",
      Icon: ListBulletsIcon,
      active: state?.bulletList ?? false,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      Icon: ListNumbersIcon,
      active: state?.orderedList ?? false,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];

  const chars = state?.chars ?? 0;
  const overLimit = maxLength !== undefined && chars >= maxLength;

  return (
    <div className="rounded-sm border border-black/10">
      <div className="flex items-center gap-1 border-b border-black/10 px-2 py-1.5">
        {tools.map(({ label, Icon, active, run }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={run}
            className={cn(
              "rounded-sm p-1.5 transition-colors disabled:opacity-40",
              active ? "bg-black text-white" : "text-black/70 hover:bg-black/5 hover:text-black",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      {maxLength !== undefined && (
        <div className="flex justify-end px-2 pb-1.5">
          <span className={cn("text-xs", overLimit ? "text-destructive" : "text-black/40")}>
            {chars}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}
