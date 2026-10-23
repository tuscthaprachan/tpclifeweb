"use client";

import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type Editor, type NodeViewProps } from "@tiptap/react";
import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button, ErrorMessage, TextInput } from "@/components/ui";
import { fieldId } from "@/lib/admin/content/form-state";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { BLOCK_DEFAULTS, normaliseEditorDoc, type BlockType } from "@/lib/rich-text/editor";
import { CUSTOM_NODES, isSafeHref } from "@/lib/rich-text/schema";
import { customBlockNodes, richTextExtensions } from "@/lib/rich-text/tiptap";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { useContentForm } from "./context";
import { PortalDialog } from "./PortalDialog";
import { BlockDialog } from "./rich-text/BlockDialog";
import { BLOCK_LABEL, summariseBlock, type RichTextRefs } from "./rich-text/blocks";

type Raw = Record<string, unknown>;

interface BlockOptions {
  locale: Locale;
  refs: RichTextRefs;
  onEdit: (type: BlockType, pos: number, attrs: Raw) => void;
}

/** How a custom block looks inside the editor: a card with what it holds, and Edit / Remove. */
function BlockCard({ node, getPos, deleteNode, selected, extension }: NodeViewProps) {
  const { locale, refs, onEdit } = extension.options as BlockOptions;
  const type = node.type.name as BlockType;
  const summary = summariseBlock(type, node.attrs as Raw, locale, refs);
  const name = a(BLOCK_LABEL[type], locale);
  return (
    <NodeViewWrapper
      contentEditable={false}
      className={`my-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-3)] rounded-panel border bg-surface-alt p-[var(--space-3)] ${
        selected ? "border-[length:var(--border-width-thick)] border-action" : "border-line"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-ink-600">{name}</p>
        <p className="m-0 break-words">{summary || a("blockEmpty", locale)}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const pos = getPos();
          if (typeof pos === "number") onEdit(type, pos, node.attrs as Raw);
        }}
      >
        {a("edit", locale)}
        <span className="visually-hidden"> {name}</span>
      </Button>
      <Button type="button" variant="quiet" size="sm" onClick={() => deleteNode()}>
        {a("remove", locale)}
        <span className="visually-hidden"> {name}</span>
      </Button>
    </NodeViewWrapper>
  );
}

interface ToolbarItem {
  id: string;
  label: string;
  /** What the button shows when it is not the full label. */
  short?: string;
  pressed?: boolean;
  disabled?: boolean;
  run: () => void;
}

const NO_STATE = { p: false, h2: false, h3: false, h4: false, bold: false, italic: false, bullet: false, ordered: false, quote: false, link: false, canUndo: false, canRedo: false };

function useToolbarState(editor: Editor | null) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      p: e?.isActive("paragraph") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      h4: e?.isActive("heading", { level: 4 }) ?? false,
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      link: e?.isActive("link") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  });
  return state ?? NO_STATE;
}

/** Bare domains get https://; anything else must pass the same check the server applies. */
function normaliseHref(raw: string): string {
  const v = raw.trim();
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(v) && !v.includes("@")) return `https://${v}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return v;
}

interface RichTextEditorProps {
  /** Name of the hidden input that posts the document as JSON. */
  name: string;
  label: string;
  /** The language this document is written in. */
  lang: "th" | "en";
  hint?: string;
  defaultValue?: RichTextDoc | null;
  refs: RichTextRefs;
}

/**
 * A visual editor for one language of a rich text field. It can only make
 * the vocabulary in lib/rich-text/schema.ts: paragraphs, headings 2 to 4,
 * lists, quotes, bold, italic, links, line breaks and the six custom blocks
 * (added and edited through a dialog). The document goes into a hidden input
 * named `name`; the server checks it again with `parseRichTextDoc`.
 */
export function RichTextEditor({ name, label, lang, hint, defaultValue, refs }: RichTextEditorProps) {
  const { errors, locale, markDirty } = useContentForm();
  const uid = useId();
  const id = fieldId(name);
  const error = errors[name];
  const [json, setJson] = useState(() => JSON.stringify(defaultValue ?? { type: "doc", content: [] }));
  const [block, setBlock] = useState<{ type: BlockType; mode: "insert" | "edit"; pos?: number; attrs: Raw } | null>(null);
  const [linkOpen, setLinkOpen] = useState<{ href: string } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const extensions = useMemo(
    () =>
      richTextExtensions(
        customBlockNodes.map((node) =>
          node.extend({
            addOptions: () => ({
              locale,
              refs,
              onEdit: (type: BlockType, pos: number, attrs: Raw) => setBlock({ type, mode: "edit", pos, attrs }),
            }),
            addNodeView: () => ReactNodeViewRenderer(BlockCard),
          }),
        ),
      ),
    [locale, refs],
  );

  const editor = useEditor({
    extensions,
    content: defaultValue && defaultValue.content.length > 0 ? defaultValue : undefined,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": `${uid}-label`,
        "aria-describedby": [hint ? `${uid}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" "),
        lang,
        class: "prose-editor min-h-[14rem] px-[var(--space-3)] py-[var(--space-3)] outline-none",
      },
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onUpdate: ({ editor: e }) => {
      setJson(JSON.stringify(normaliseEditorDoc(e.getJSON())));
      markDirty();
    },
  });
  const state = useToolbarState(editor);

  const closeDialogs = useCallback(() => {
    setBlock(null);
    setLinkOpen(null);
    setLinkError(null);
    editorRef.current?.commands.focus();
  }, []);

  const T = (key: AdminKey) => a(key, locale);
  const chain = () => editor!.chain().focus();
  const items: ToolbarItem[] = editor
    ? [
        { id: "p", label: T("rteParagraph"), pressed: state.p, run: () => chain().setParagraph().run() },
        { id: "h2", label: T("rteHeading"), pressed: state.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
        { id: "h3", label: T("rteSubheading"), pressed: state.h3, run: () => chain().toggleHeading({ level: 3 }).run() },
        { id: "h4", label: T("rteSmallHeading"), pressed: state.h4, run: () => chain().toggleHeading({ level: 4 }).run() },
        { id: "bold", label: T("rteBold"), short: "B", pressed: state.bold, run: () => chain().toggleBold().run() },
        { id: "italic", label: T("rteItalic"), short: "I", pressed: state.italic, run: () => chain().toggleItalic().run() },
        { id: "bullet", label: T("rteBullets"), pressed: state.bullet, run: () => chain().toggleBulletList().run() },
        { id: "ordered", label: T("rteNumbers"), pressed: state.ordered, run: () => chain().toggleOrderedList().run() },
        { id: "quote", label: T("rteQuote"), pressed: state.quote, run: () => chain().toggleBlockquote().run() },
        {
          id: "link",
          label: T("rteLink"),
          pressed: state.link,
          run: () => setLinkOpen({ href: (editor.getAttributes("link").href as string | undefined) ?? "" }),
        },
        { id: "br", label: T("rteLineBreak"), run: () => chain().setHardBreak().run() },
        { id: "undo", label: T("rteUndo"), disabled: !state.canUndo, run: () => chain().undo().run() },
        { id: "redo", label: T("rteRedo"), disabled: !state.canRedo, run: () => chain().redo().run() },
      ]
    : [];
  const blockItems = CUSTOM_NODES.map((type) => ({
    id: type,
    label: a("rteInsertBlock", locale, { block: a(BLOCK_LABEL[type], locale).toLowerCase() }),
    short: a(BLOCK_LABEL[type], locale),
    run: () => setBlock({ type, mode: "insert", attrs: structuredClone(BLOCK_DEFAULTS[type]) as Raw }),
  }));

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const all = [...items, ...blockItems] as ToolbarItem[];

  function onToolbarKey(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const buttons = [...(toolbarRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const step = keys[event.key]!;
    const next = Number.isFinite(step) ? (active + step + buttons.length) % buttons.length : step < 0 ? 0 : buttons.length - 1;
    setActive(next);
    buttons[next]?.focus();
  }

  function applyLink() {
    if (!editor || !linkOpen) return;
    const href = normaliseHref(linkOpen.href);
    if (!href) {
      chain().extendMarkRange("link").unsetLink().run();
      return closeDialogs();
    }
    if (!isSafeHref(href)) return setLinkError(a("errLinkUnsafe", locale));
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain().extendMarkRange("link").setLink({ href }).run();
    }
    closeDialogs();
  }

  function applyBlock(attrs: Raw) {
    if (!editor || !block) return;
    if (block.mode === "insert") chain().insertContent({ type: block.type, attrs }).run();
    else {
      const pos = block.pos!;
      editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, attrs));
    }
    setBlock(null);
    editor.commands.focus();
    // setNodeMarkup does not always fire onUpdate for attrs-only changes in every version; make sure the hidden value follows.
    setJson(JSON.stringify(normaliseEditorDoc(editor.getJSON())));
    markDirty();
  }

  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <p id={`${uid}-label`} className="m-0 text-base font-medium text-ink-900">
        {label}
      </p>
      {hint ? (
        <p id={`${uid}-hint`} className="m-0 text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      <input type="hidden" name={name} value={json} />
      <div className={`rounded-control bg-surface ${error ? "border-[length:var(--border-width-thick)] border-error" : "border border-line-strong"}`}>
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label={a("rteToolbar", locale, { label })}
          aria-controls={id}
          onKeyDown={onToolbarKey}
          className="flex flex-wrap gap-[var(--space-1)] border-b border-line bg-surface-alt p-[var(--space-2)]"
        >
          {all.map((item, i) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={item.pressed ? "primary" : "secondary"}
              aria-pressed={item.pressed === undefined ? undefined : item.pressed}
              aria-label={item.short ? item.label : undefined}
              title={item.label}
              disabled={item.disabled || !editor}
              tabIndex={i === active ? 0 : -1}
              onFocus={() => setActive(i)}
              onClick={item.run}
              className={i === items.length ? "ml-[var(--space-3)]" : undefined}
            >
              {item.short ?? item.label}
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}

      {block ? (
        <BlockDialog key={`${block.mode}-${block.pos ?? "new"}-${block.type}`} type={block.type} mode={block.mode} initial={block.attrs} locale={locale} refs={refs} onSubmit={applyBlock} onClose={closeDialogs} />
      ) : null}

      <PortalDialog open={linkOpen !== null} onClose={closeDialogs} title={a("rteLinkTitle", locale)} headingLevel={2} locale={locale} className="w-[min(100vw-2rem,30rem)]">
        {linkOpen ? (
          <div
            className="flex flex-col gap-[var(--space-3)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          >
            <TextInput
              id={`${uid}-href`}
              label={a("rteLinkAddress", locale)}
              hint={a("rteLinkHint", locale)}
              value={linkOpen.href}
              onChange={(e) => setLinkOpen({ href: e.target.value })}
              error={linkError ?? undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-[var(--space-3)]">
              <Button type="button" onClick={applyLink}>
                {a("rteLinkApply", locale)}
              </Button>
              {state.link ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    chain().extendMarkRange("link").unsetLink().run();
                    closeDialogs();
                  }}
                >
                  {a("rteLinkRemove", locale)}
                </Button>
              ) : null}
              <Button type="button" variant="quiet" onClick={closeDialogs}>
                {a("cancel", locale)}
              </Button>
            </div>
          </div>
        ) : null}
      </PortalDialog>
    </div>
  );
}

/** One editor per language, stacked, each labelled with its language. Names are `<name>.th` and `<name>.en`. */
export function BilingualRichTextField({
  name,
  label,
  hint,
  defaultValue,
  refs,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: { th?: RichTextDoc | null; en?: RichTextDoc | null };
  refs: RichTextRefs;
}) {
  const { locale } = useContentForm();
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {(["th", "en"] as const).map((lang) => (
        <RichTextEditor
          key={lang}
          name={`${name}.${lang}`}
          lang={lang}
          label={`${label} (${a(lang === "th" ? "langThai" : "langEnglish", locale)})`}
          hint={hint}
          defaultValue={defaultValue?.[lang]}
          refs={refs}
        />
      ))}
    </div>
  );
}
