"use client";

import { Extension, type Range } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, ReactNodeViewRenderer, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { useScrollLock } from "@/components/admin/hooks/scroll-lock";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { useStatusMessage } from "@/components/hooks/use-status-message";
import { Button, ErrorMessage, TextInput } from "@/components/ui";
import type { ImageChoice } from "@/lib/admin/content/images";
import { fieldId } from "@/lib/admin/content/form-state";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { BLOCK_DEFAULTS, normaliseEditorDoc, type BlockType } from "@/lib/rich-text/editor";
import { CUSTOM_NODES, isRichTextEmpty } from "@/lib/rich-text/schema";
import { textStats } from "@/lib/rich-text/stats";
import { richTextToPlainText } from "@/lib/rich-text/text";
import { customBlockNodes, richTextExtensions } from "@/lib/rich-text/tiptap";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { useContentForm } from "./context";
import { PortalDialog } from "./PortalDialog";
import { BlockCard } from "./rich-text/BlockCard";
import { EditorBridge } from "./rich-text/bridge";
import { announcementFor, editorReducer, initialEditor, type OverlayKind } from "./rich-text/editor-machine";
import { inertOthers } from "./rich-text/inert";
import { BlockDialog } from "./rich-text/BlockDialog";
import { BLOCK_ICON, BLOCK_LABEL, type RichTextRefs } from "./rich-text/blocks";
import { FindPanel } from "./rich-text/FindPanel";
import { FindReplace } from "./rich-text/find-replace";
import { IconButton } from "./rich-text/IconButton";
import { ImageUploadDialog } from "./rich-text/ImageUploadDialog";
import { LinkDialog, linkTargetFor } from "./rich-text/LinkDialog";
import { Menu } from "./rich-text/Menu";
import { MarkdownPane } from "./rich-text/MarkdownPane";
import { shortcutLabel, SHORTCUTS, ShortcutsDialog, type ShortcutId } from "./rich-text/ShortcutsDialog";
import { slashExtension, type SlashItem } from "./rich-text/slash";
import { SlashMenu } from "./rich-text/SlashMenu";
import { Toolbar, type ToolbarAction, type ToolbarGroup } from "./rich-text/Toolbar";

type Raw = Record<string, unknown>;
type MarkdownModule = typeof import("@/lib/rich-text/markdown");

const EMPTY_DOC: RichTextDoc = { type: "doc", content: [] };

export interface RichTextEditorHandle {
  /** The document as it would be saved now. */
  getDoc: () => RichTextDoc;
  /** Replaces the whole document, as an edit the staff member can undo. */
  setDoc: (doc: RichTextDoc) => void;
}

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

const NO_STATE = {
  p: false,
  h2: false,
  h3: false,
  h4: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  bullet: false,
  ordered: false,
  quote: false,
  codeBlock: false,
  link: false,
  inTable: false,
  headerRow: false,
  canUndo: false,
  canRedo: false,
};

function useToolbarState(editor: Editor | null) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return NO_STATE;
      const { $from } = e.state.selection;
      let headerRow = false;
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === "table") {
          headerRow = $from.node(d).firstChild?.firstChild?.type.name === "tableHeader";
          break;
        }
      }
      return {
        p: e.isActive("paragraph"),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        h4: e.isActive("heading", { level: 4 }),
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        quote: e.isActive("blockquote"),
        codeBlock: e.isActive("codeBlock"),
        link: e.isActive("link"),
        inTable: e.isActive("table"),
        headerRow,
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });
  return state ?? NO_STATE;
}

function shortcutExtension(bridge: EditorBridge) {
  return Extension.create({
    name: "editorShortcuts",
    addKeyboardShortcuts() {
      return {
        "Mod-k": () => {
          bridge.keys.link();
          return true;
        },
        "Mod-Shift-f": () => {
          bridge.keys.find();
          return true;
        },
        "Mod-Shift-Enter": () => {
          bridge.keys.fullscreen();
          return true;
        },
      };
    },
  });
}

const imageFile = (files: FileList | null | undefined) => [...(files ?? [])].find((f) => f.type.startsWith("image/")) ?? null;

interface RichTextEditorProps {
  /** Name of the hidden input that posts the document as JSON. */
  name: string;
  label: string;
  /** The language this document is written in. */
  lang: "th" | "en";
  hint?: string;
  defaultValue?: RichTextDoc | null;
  refs: RichTextRefs;
  handleRef?: Ref<RichTextEditorHandle>;
  /** Extra controls beside the label, for example "Copy layout from Thai". */
  headerExtra?: ReactNode;
}

/**
 * A visual and Markdown editor for one language of a rich text field. It can
 * only make the vocabulary in lib/rich-text/schema.ts. The document goes into
 * a hidden input named `name` as JSON in either mode; the server checks it
 * again with `parseRichTextDoc`.
 */
export function RichTextEditor({ name, label, lang, hint, defaultValue, refs, handleRef, headerExtra }: RichTextEditorProps) {
  const { errors, locale, markDirty } = useContentForm();
  const uid = useId();
  const id = fieldId(name);
  const error = errors[name];
  const initial = defaultValue ?? EMPTY_DOC;
  const [json, setJson] = useState(() => JSON.stringify(initial));
  const [plain, setPlain] = useState(() => richTextToPlainText(initial));
  const [ui, dispatch] = useReducer(editorReducer, initialEditor);
  const [images, setImages] = useState<ImageChoice[]>(refs.images);
  const status = useStatusMessage<string>();
  const announce = status.show;
  const mode = ui.mode.kind;
  const md = ui.mode.kind === "markdown" ? ui.mode.md : "";
  const mdError = ui.mode.kind === "markdown" ? ui.mode.error : null;
  const modeBusy = ui.busy !== null;
  const full = ui.full;
  const findOpen = ui.overlay.kind === "find";
  const block = ui.overlay.kind === "block" ? ui.overlay.block : null;
  const linkTarget = ui.overlay.kind === "link" ? ui.overlay.target : null;
  const pasted = ui.overlay.kind === "pasted" ? ui.overlay.file : null;
  const shortcutsOpen = ui.overlay.kind === "shortcuts";
  const mac = useSyncExternalStore(subscribe, isMac, () => false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const mdLib = useRef<MarkdownModule | null>(null);
  const mdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mdRef = useRef("");
  const jsonRef = useRef(json);
  const pastePos = useRef<number | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [bridge] = useState(() => new EditorBridge());

  const liveRefs = useMemo<RichTextRefs>(() => ({ ...refs, images }), [refs, images]);

  const commit = useCallback((doc: RichTextDoc) => {
    const next = JSON.stringify(doc);
    jsonRef.current = next;
    setJson(next);
    setPlain(richTextToPlainText(doc));
  }, []);

  useEffect(() => {
    bridge.update({
      ctx: {
        locale,
        refs: liveRefs,
        onEdit: (type, pos, attrs) => dispatch({ type: "openBlock", block: { type, mode: "edit", pos, attrs } }),
        announce,
      },
    });
  }, [bridge, locale, liveRefs, announce]);

  const extensions = useMemo(
    () => [
      ...richTextExtensions(
        customBlockNodes.map((node) =>
          node.extend({
            addOptions: () => ({ bridge }),
            addNodeView: () => ReactNodeViewRenderer(BlockCard),
          }),
        ),
      ),
      FindReplace,
      slashExtension(bridge),
      shortcutExtension(bridge),
    ],
    [bridge],
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
        "aria-haspopup": "listbox",
        "aria-labelledby": `${uid}-label`,
        "aria-describedby": [hint ? `${uid}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" "),
        lang,
        class: "prose-editor min-h-[14rem] px-[var(--space-3)] py-[var(--space-3)] outline-none",
      },
      handlePaste: (_view, event) => {
        const file = imageFile(event.clipboardData?.files);
        if (!file) return false;
        event.preventDefault();
        bridge.onFile(file, null);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const file = moved ? null : imageFile(event.dataTransfer?.files);
        if (!file) return false;
        event.preventDefault();
        bridge.onFile(file, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      commit(normaliseEditorDoc(e.getJSON()));
      markDirty();
    },
  });
  const state = useToolbarState(editor);

  const T = (key: AdminKey, values?: Record<string, string | number>) => a(key, locale, values);
  const keyLabel = (id: ShortcutId) => shortcutLabel(SHORTCUTS[id], mac);

  const closeOverlay = useCallback(
    (kind?: OverlayKind) => {
      dispatch({ type: "close", overlay: kind });
      if (mode === "visual") editor?.commands.focus();
    },
    [editor, mode],
  );

  const openLink = useCallback(() => {
    if (editor) dispatch({ type: "openLink", target: linkTargetFor(editor) });
  }, [editor]);

  const toggleFull = useCallback(() => dispatch({ type: "toggleFull" }), []);
  const openFind = useCallback(() => dispatch({ type: "openFind" }), []);

  useEffect(() => {
    bridge.update({
      keys: { link: openLink, find: openFind, fullscreen: toggleFull },
      onFile: (file, pos) => {
        pastePos.current = pos;
        dispatch({ type: "openPasted", file });
      },
    });
  }, [bridge, openLink, openFind, toggleFull]);

  useScrollLock(full);

  useEffect(() => {
    if (!full) return;
    const restore = wrapRef.current ? inertOthers(wrapRef.current) : undefined;
    editor?.commands.focus();
    return restore;
  }, [full, editor]);

  useEffect(() => {
    if (ui.overlay.kind !== "pasted") pastePos.current = null;
  }, [ui.overlay.kind]);

  const seen = useRef(ui);
  useEffect(() => {
    const said = announcementFor(seen.current, ui);
    seen.current = ui;
    if (!said) return;
    const key = { visual: "edAnnounceVisual", markdown: "edAnnounceMarkdown", fullOn: "edAnnounceFullOn", fullOff: "edAnnounceFullOff" } as const;
    announce(T(key[said]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui]);

  useEffect(() => {
    if (!editor) return;
    const follow = ({ transaction }: { transaction: { docChanged: boolean; mapping: { map: (pos: number) => number } } }) => {
      if (pastePos.current !== null && transaction.docChanged) pastePos.current = transaction.mapping.map(pastePos.current);
    };
    editor.on("transaction", follow);
    return () => {
      editor.off("transaction", follow);
    };
  }, [editor]);

  const chain = () => editor!.chain().focus();
  const insertBlock = (type: BlockType) => dispatch({ type: "openBlock", block: { type, mode: "insert", attrs: structuredClone(BLOCK_DEFAULTS[type]) as Raw } });

  const insertDefs: Array<{ id: string; label: string; icon: ConsoleIconName; shortcut?: string; keywords?: string; run: (range?: Range) => void }> = editor
    ? [
        { id: "table", label: T("edTable"), icon: "rteTable", run: (r) => (r ? chain().deleteRange(r) : chain()).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { id: "codeBlock", label: T("edCodeBlock"), icon: "rteCodeBlock", shortcut: keyLabel("codeBlock"), run: (r) => (r ? chain().deleteRange(r) : chain()).setCodeBlock().run() },
        { id: "rule", label: T("edRule"), icon: "rteRule", run: (r) => (r ? chain().deleteRange(r) : chain()).setHorizontalRule().run() },
        { id: "br", label: T("rteLineBreak"), icon: "rteLineBreak", shortcut: keyLabel("lineBreak"), run: () => chain().setHardBreak().run() },
        ...CUSTOM_NODES.map((type) => ({
          id: type,
          label: a(BLOCK_LABEL[type], locale),
          icon: BLOCK_ICON[type],
          run: (r?: Range) => {
            if (r) chain().deleteRange(r).run();
            insertBlock(type);
          },
        })),
      ]
    : [];

  useEffect(() => {
    if (!editor) return;
    const text = (key: AdminKey) => `${a(key, "th")} ${a(key, "en")}`.toLowerCase();
    const textItems: SlashItem[] = [
      { id: "h2", label: T("rteHeading"), icon: "rteHeading2", keywords: `${text("rteHeading")} h2 heading`, run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 2 }).run() },
      { id: "h3", label: T("rteSubheading"), icon: "rteHeading3", keywords: `${text("rteSubheading")} h3 heading`, run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 3 }).run() },
      { id: "h4", label: T("rteSmallHeading"), icon: "rteHeading4", keywords: `${text("rteSmallHeading")} h4 heading`, run: (e, r) => e.chain().focus().deleteRange(r).setNode("heading", { level: 4 }).run() },
      { id: "bullets", label: T("rteBullets"), icon: "rteBullets", keywords: `${text("rteBullets")} list ul`, run: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run() },
      { id: "numbers", label: T("rteNumbers"), icon: "rteNumbers", keywords: `${text("rteNumbers")} list ol`, run: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run() },
      { id: "quote", label: T("rteQuote"), icon: "rteQuote", keywords: `${text("rteQuote")} blockquote`, run: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run() },
    ];
    const keywordsOf: Record<string, string> = {
      table: `${text("edTable")} grid`,
      codeBlock: `${text("edCodeBlock")} code pre`,
      rule: `${text("edRule")} divider hr line`,
    };
    const insertItems: SlashItem[] = insertDefs
      .filter((d) => d.id !== "br")
      .map((d) => ({
        id: d.id,
        label: d.label,
        icon: d.icon,
        keywords: keywordsOf[d.id] ?? `${a(BLOCK_LABEL[d.id as BlockType], "th")} ${a(BLOCK_LABEL[d.id as BlockType], "en")}`.toLowerCase(),
        run: (_e, r) => d.run(r),
      }));
    const all = [...textItems, ...insertItems];
    bridge.update({
      items: (query) => {
        const q = query.trim().toLowerCase();
        return q ? all.filter((item) => `${item.label.toLowerCase()} ${item.keywords}`.includes(q)) : all;
      },
    });
  });

  const slashListId = `${uid}-slash`;
  const onSlashActive = useCallback(
    (activeId: string | null, listId: string | null) => {
      const dom = editor?.view?.dom;
      if (!dom) return;
      if (activeId) dom.setAttribute("aria-activedescendant", activeId);
      else dom.removeAttribute("aria-activedescendant");
      if (listId) dom.setAttribute("aria-controls", listId);
      else dom.removeAttribute("aria-controls");
    },
    [editor],
  );

  /* ---------- Markdown mode ---------- */

  const loadMarkdown = useCallback(async () => {
    mdLib.current ??= await import("@/lib/rich-text/markdown");
    return mdLib.current;
  }, []);

  const applyDoc = useCallback(
    (doc: RichTextDoc, emit: boolean) => {
      if (!editor) return;
      editor.commands.setContent(isRichTextEmpty(doc) ? "" : doc, { emitUpdate: emit });
      if (!emit) commit(normaliseEditorDoc(editor.getJSON()));
    },
    [editor, commit],
  );

  const failMarkdownImport = (e: unknown) => {
    announce(T("edMdError", { message: e instanceof Error ? e.message : String(e) }));
    dispatch({ type: "modeFailed" });
  };

  async function showMarkdown() {
    if (!editor || mode === "markdown" || ui.busy) return;
    dispatch({ type: "modeStart", to: "markdown" });
    try {
      const lib = await loadMarkdown();
      mdRef.current = lib.docToMarkdown(normaliseEditorDoc(editor.getJSON()));
      dispatch({ type: "markdownReady", md: mdRef.current });
    } catch (e) {
      failMarkdownImport(e);
    }
  }

  async function showVisual() {
    if (!editor || mode === "visual" || ui.busy) return;
    const dirty = ui.mode.kind === "markdown" && ui.mode.dirty;
    dispatch({ type: "modeStart", to: "visual" });
    try {
      const lib = await loadMarkdown();
      cancelMarkdownTimer();
      try {
        if (dirty) applyDoc(lib.markdownToDoc(mdRef.current), false);
        dispatch({ type: "visualReady" });
        requestAnimationFrame(() => editor.commands.focus());
      } catch (e) {
        dispatch({ type: "markdownRejected", error: T("edMdError", { message: lib.markdownErrorMessage(e) }) });
      }
    } catch (e) {
      failMarkdownImport(e);
    }
  }

  function cancelMarkdownTimer() {
    if (mdTimer.current) clearTimeout(mdTimer.current);
    mdTimer.current = null;
  }

  function parseMarkdown(value: string): RichTextDoc | null {
    const lib = mdLib.current;
    if (!lib) return null;
    try {
      const doc = lib.markdownToDoc(value);
      commit(doc);
      dispatch({ type: "markdownParsed" });
      return doc;
    } catch (e) {
      dispatch({ type: "markdownInvalid", error: T("edMdError", { message: lib.markdownErrorMessage(e) }) });
      return null;
    }
  }

  /** Parses Markdown typed in the last 300 ms now. Returns the document as it stands afterwards: the new parse, or the last good one if the text does not parse. */
  function flushMarkdown(): RichTextDoc {
    if (mdTimer.current) {
      cancelMarkdownTimer();
      const doc = parseMarkdown(mdRef.current);
      if (doc) return doc;
    }
    return JSON.parse(jsonRef.current) as RichTextDoc;
  }

  function onMarkdownChange(value: string) {
    mdRef.current = value;
    dispatch({ type: "markdownEdited", md: value });
    markDirty();
    cancelMarkdownTimer();
    mdTimer.current = setTimeout(() => {
      mdTimer.current = null;
      parseMarkdown(value);
    }, 300);
  }

  useEffect(() => cancelMarkdownTimer, []);

  const flushRef = useRef(flushMarkdown);
  useEffect(() => {
    flushRef.current = flushMarkdown;
  });

  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const onFormData = (event: FormDataEvent) => {
      if (mdTimer.current) event.formData.set(name, JSON.stringify(flushRef.current()));
    };
    const onSubmit = () => {
      if (mdTimer.current && hiddenRef.current) hiddenRef.current.value = JSON.stringify(flushRef.current());
    };
    form.addEventListener("formdata", onFormData);
    form.addEventListener("submit", onSubmit, true);
    return () => {
      form.removeEventListener("formdata", onFormData);
      form.removeEventListener("submit", onSubmit, true);
    };
  }, [name]);

  useImperativeHandle(
    handleRef,
    () => ({
      getDoc: () => (mode === "visual" && editor ? normaliseEditorDoc(editor.getJSON()) : flushMarkdown()),
      setDoc: (doc) => {
        applyDoc(doc, true);
        if (mode === "markdown" && mdLib.current) {
          cancelMarkdownTimer();
          mdRef.current = mdLib.current.docToMarkdown(doc);
          dispatch({ type: "markdownReplaced", md: mdRef.current });
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, mode, applyDoc],
  );

  /* ---------- Actions ---------- */

  const act = (idName: string, text: string, icon: ConsoleIconName, extra: Partial<ToolbarAction> & { run: () => void }): ToolbarAction => ({ id: idName, label: text, icon, ...extra });

  const groups: ToolbarGroup[] = editor
    ? [
        {
          id: "style",
          kind: "menu",
          label: T("edGroupStyle"),
          triggerIcon: state.h2 ? "rteHeading2" : state.h3 ? "rteHeading3" : state.h4 ? "rteHeading4" : "rteParagraph",
          radio: true,
          width: 64,
          rank: 6,
          actions: [
            act("p", T("rteParagraph"), "rteParagraph", { pressed: state.p, shortcut: keyLabel("paragraph"), run: () => chain().setParagraph().run() }),
            act("h2", T("rteHeading"), "rteHeading2", { pressed: state.h2, shortcut: keyLabel("heading2"), run: () => chain().setHeading({ level: 2 }).run() }),
            act("h3", T("rteSubheading"), "rteHeading3", { pressed: state.h3, shortcut: keyLabel("heading3"), run: () => chain().setHeading({ level: 3 }).run() }),
            act("h4", T("rteSmallHeading"), "rteHeading4", { pressed: state.h4, shortcut: keyLabel("heading4"), run: () => chain().setHeading({ level: 4 }).run() }),
          ],
        },
        {
          id: "marks",
          kind: "buttons",
          label: T("edGroupMarks"),
          actions: [
            act("bold", T("rteBold"), "rteBold", { rank: 1, pressed: state.bold, shortcut: keyLabel("bold"), run: () => chain().toggleBold().run() }),
            act("italic", T("rteItalic"), "rteItalic", { rank: 2, pressed: state.italic, shortcut: keyLabel("italic"), run: () => chain().toggleItalic().run() }),
            act("underline", T("edUnderline"), "rteUnderline", { rank: 10, pressed: state.underline, shortcut: keyLabel("underline"), run: () => chain().toggleUnderline().run() }),
            act("strike", T("edStrike"), "rteStrike", { rank: 11, pressed: state.strike, shortcut: keyLabel("strike"), run: () => chain().toggleStrike().run() }),
            act("code", T("edCode"), "rteCode", { rank: 12, pressed: state.code, shortcut: keyLabel("code"), run: () => chain().toggleCode().run() }),
          ],
        },
        {
          id: "lists",
          kind: "buttons",
          label: T("edGroupLists"),
          actions: [
            act("bullets", T("rteBullets"), "rteBullets", { rank: 4, pressed: state.bullet, shortcut: keyLabel("bullets"), run: () => chain().toggleBulletList().run() }),
            act("numbers", T("rteNumbers"), "rteNumbers", { rank: 5, pressed: state.ordered, shortcut: keyLabel("numbers"), run: () => chain().toggleOrderedList().run() }),
            act("quote", T("rteQuote"), "rteQuote", { rank: 13, pressed: state.quote, shortcut: keyLabel("quote"), run: () => chain().toggleBlockquote().run() }),
          ],
        },
        {
          id: "link",
          kind: "buttons",
          label: T("edGroupLink"),
          actions: [
            act("link", T("rteLink"), "rteLink", { rank: 3, pressed: state.link, shortcut: keyLabel("link"), run: openLink }),
            act("unlink", T("edUnlink"), "rteUnlink", { rank: 14, disabled: !state.link, run: () => chain().extendMarkRange("link").unsetLink().run() }),
          ],
        },
        {
          id: "insert",
          kind: "menu",
          label: T("edInsertTitle"),
          triggerIcon: "add",
          triggerText: T("edInsert"),
          width: 96,
          rank: 9,
          actions: insertDefs.map((d, i) => act(d.id, d.label, d.icon, { shortcut: d.shortcut, separator: i === 4, run: () => d.run() })),
        },
        {
          id: "history",
          kind: "buttons",
          label: T("edGroupHistory"),
          actions: [
            act("undo", T("rteUndo"), "rteUndo", { rank: 7, disabled: !state.canUndo, shortcut: keyLabel("undo"), run: () => chain().undo().run() }),
            act("redo", T("rteRedo"), "rteRedo", { rank: 8, disabled: !state.canRedo, shortcut: keyLabel("redo"), run: () => chain().redo().run() }),
          ],
        },
        {
          id: "tools",
          kind: "buttons",
          label: T("edGroupTools"),
          actions: [
            act("find", T("edFind"), "search", { pressed: findOpen, shortcut: keyLabel("find"), run: () => dispatch({ type: "toggleFind" }) }),
            act("shortcuts", T("edShortcuts"), "rteKeyboard", { run: () => dispatch({ type: "openShortcuts" }) }),
            act("full", full ? T("edFullscreenExit") : T("edFullscreen"), full ? "rteFullscreenExit" : "rteFullscreen", { pressed: full, shortcut: keyLabel("fullscreen"), run: toggleFull }),
          ],
        },
      ]
    : [];

  function applyBlock(attrs: Raw) {
    if (!editor || !block) return;
    if (block.mode === "insert") chain().insertContent({ type: block.type, attrs }).run();
    else {
      const pos = block.pos!;
      editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, attrs));
    }
    dispatch({ type: "close", overlay: "block" });
    editor.commands.focus();
    commit(normaliseEditorDoc(editor.getJSON()));
    markDirty();
  }

  function insertPastedImage(image: ImageChoice, alt: { th: string; en: string }) {
    if (!editor || !pasted) return;
    const decorative = image.isDecorative;
    const attrs = { imageId: image.id, isDecorative: decorative, alt: decorative ? null : alt, caption: null };
    setImages((cur) => (cur.some((i) => i.id === image.id) ? cur : [image, ...cur]));
    const at = pastePos.current;
    const chainWith = editor.chain().focus();
    if (at !== null && at >= 0 && at <= editor.state.doc.content.size) chainWith.insertContentAt(at, { type: "image", attrs }).run();
    else chainWith.insertContent({ type: "image", attrs }).run();
    pastePos.current = null;
    dispatch({ type: "close", overlay: "pasted" });
    editor.commands.focus();
  }

  const onWrapperKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (event.key === "Escape" && !event.defaultPrevented && wrap?.contains(event.target as Node) && (full || ui.overlay.kind !== "none")) {
      event.preventDefault();
      dispatch({ type: "escape" });
      return;
    }
    if (full && event.key === "Tab" && wrap) {
      const tabbables = [...wrap.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(
        (el) => el.offsetParent !== null && !el.closest("[hidden]"),
      );
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };

  const stats = textStats(plain, lang);
  const visual = mode === "visual";

  return (
    <div
      ref={wrapRef}
      role={full ? "dialog" : undefined}
      aria-modal={full ? true : undefined}
      aria-label={full ? T("edFullscreenLabel", { label }) : undefined}
      onKeyDown={onWrapperKey}
      className={full ? "fixed inset-0 z-50 flex flex-col gap-[var(--space-2)] overflow-auto bg-surface p-[var(--space-4)]" : "flex flex-col gap-[var(--space-1)]"}
    >
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
        <p id={`${uid}-label`} className="m-0 text-base font-medium text-ink-900">
          {label}
        </p>
        <div className="flex flex-wrap items-center gap-[var(--space-2)]">
          {headerExtra}
          <div role="group" aria-label={T("edModeLabel")} className="inline-flex overflow-hidden rounded-control border border-line-strong">
            {(["visual", "markdown"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                disabled={modeBusy || !editor}
                onClick={() => (m === "visual" ? showVisual() : showMarkdown())}
                className="min-h-[var(--target-min)] px-[var(--space-3)] text-sm font-medium text-ink-900 hover:bg-surface-sunk aria-pressed:bg-action aria-pressed:text-action-ink disabled:opacity-60"
              >
                {T(m === "visual" ? "edModeVisual" : "edModeMarkdown")}
              </button>
            ))}
          </div>
        </div>
      </div>
      {hint ? (
        <p id={`${uid}-hint`} className="m-0 text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      <input ref={hiddenRef} type="hidden" name={name} value={json} />
      <div className={`flex min-h-0 flex-col rounded-control bg-surface ${full ? "flex-1" : ""} ${error ? "border-[length:var(--border-width-thick)] border-error" : "border border-line-strong"}`}>
        {visual ? (
          <>
            <Toolbar groups={groups} label={T("rteToolbar", { label })} controls={id} moreLabel={T("edMore")} onAfterMenu={() => editor?.commands.focus()} />
            {editor && findOpen ? <FindPanel editor={editor} locale={locale} focusNonce={ui.findFocus} onClose={() => dispatch({ type: "close", overlay: "find" })} /> : null}
            {editor && state.inTable ? (
              <div role="toolbar" aria-label={T("edTableBar")} className="flex flex-wrap items-center gap-[2px] border-b border-line bg-surface-alt p-[var(--space-1)]">
                <div className="sm:hidden">
                  <Menu
                    label={T("edTableBar")}
                    triggerLabel={T("edTableBar")}
                    icon="rteTable"
                    items={[
                      { id: "rowBefore", label: T("edRowBefore"), icon: "rteRowBefore", run: () => chain().addRowBefore().run() },
                      { id: "rowAfter", label: T("edRowAfter"), icon: "rteRowAfter", run: () => chain().addRowAfter().run() },
                      { id: "rowDelete", label: T("edRowDelete"), icon: "delete", run: () => chain().deleteRow().run() },
                      { id: "colBefore", label: T("edColumnBefore"), icon: "rteColumnBefore", separator: true, run: () => chain().addColumnBefore().run() },
                      { id: "colAfter", label: T("edColumnAfter"), icon: "rteColumnAfter", run: () => chain().addColumnAfter().run() },
                      { id: "colDelete", label: T("edColumnDelete"), icon: "delete", run: () => chain().deleteColumn().run() },
                      { id: "header", label: T("edHeaderRow"), icon: "rteHeaderRow", checked: state.headerRow, separator: true, run: () => chain().toggleHeaderRow().run() },
                      { id: "tableDelete", label: T("edTableDelete"), icon: "delete", run: () => chain().deleteTable().run() },
                    ]}
                    onAfterRun={() => editor.commands.focus()}
                  >
                    <span className="text-sm">{T("edTableBar")}</span>
                  </Menu>
                </div>
                <div className="hidden flex-wrap items-center gap-[2px] sm:flex">
                  <IconButton icon="rteRowBefore" label={T("edRowBefore")} onClick={() => chain().addRowBefore().run()} />
                  <IconButton icon="rteRowAfter" label={T("edRowAfter")} onClick={() => chain().addRowAfter().run()} />
                  <IconButton icon="delete" label={T("edRowDelete")} onClick={() => chain().deleteRow().run()} />
                  <IconButton icon="rteColumnBefore" label={T("edColumnBefore")} onClick={() => chain().addColumnBefore().run()} />
                  <IconButton icon="rteColumnAfter" label={T("edColumnAfter")} onClick={() => chain().addColumnAfter().run()} />
                  <IconButton icon="delete" label={T("edColumnDelete")} onClick={() => chain().deleteColumn().run()} />
                  <IconButton icon="rteHeaderRow" label={T("edHeaderRow")} pressed={state.headerRow} onClick={() => chain().toggleHeaderRow().run()} />
                  <IconButton icon="delete" label={T("edTableDelete")} onClick={() => chain().deleteTable().run()} />
                </div>
              </div>
            ) : null}
            {editor && state.codeBlock ? (
              <div role="group" aria-label={T("edCodeBar")} className="flex items-end gap-[var(--space-2)] border-b border-line bg-surface-alt p-[var(--space-2)]">
                <TextInput
                  id={`${uid}-codelang`}
                  label={T("edCodeLanguage")}
                  hint={T("edCodeLanguageHint")}
                  value={String(editor.getAttributes("codeBlock").language ?? "")}
                  onChange={(e) => editor.chain().updateAttributes("codeBlock", { language: e.target.value.replace(/[^A-Za-z0-9_+#.-]/g, "").slice(0, 32) || null }).run()}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full max-w-[16rem]"
                />
              </div>
            ) : null}
          </>
        ) : null}
        <div hidden={!visual} className={full ? "min-h-0 flex-1 overflow-y-auto" : undefined}>
          <EditorContent editor={editor} />
        </div>
        {editor && visual ? (
          <BubbleMenu
            editor={editor}
            options={{ placement: "top", offset: 8 }}
            shouldShow={({ editor: e, state: s }) => e.isEditable && !s.selection.empty && !(s.selection instanceof NodeSelection) && !e.isActive("codeBlock") && !findOpen}
          >
            <div role="toolbar" aria-label={T("edBubbleLabel")} className="flex gap-[2px] rounded-control border border-line-strong bg-surface-overlay p-[2px] shadow-[var(--shadow-elevation)]">
              {(groups.find((g) => g.id === "marks")?.actions ?? []).map((action) => (
                <IconButton key={action.id} icon={action.icon} label={action.shortcut ? `${action.label} (${action.shortcut})` : action.label} pressed={action.pressed} onClick={action.run} tabIndex={-1} />
              ))}
              <IconButton icon="rteLink" label={`${T("rteLink")} (${keyLabel("link")})`} pressed={state.link} onClick={openLink} tabIndex={-1} />
            </div>
          </BubbleMenu>
        ) : null}
        {!visual ? (
          <MarkdownPane
            id={`${id}-markdown`}
            value={md}
            onChange={onMarkdownChange}
            lang={lang}
            labelledBy={`${uid}-label`}
            describedBy={[hint ? `${uid}-hint` : "", `${uid}-mdhint`].filter(Boolean).join(" ")}
            error={mdError}
            errorId={`${uid}-mderror`}
            rows={full ? 28 : 16}
          />
        ) : null}
        {!visual ? (
          <div className="border-t border-line px-[var(--space-3)] py-[var(--space-2)] text-sm text-ink-600">
            <p id={`${uid}-mdhint`} className="m-0">
              {T("edMdHint")}
            </p>
            {mdError ? <p className="m-0 mt-[var(--space-1)] font-medium text-ink-900">{T("edMdUnsaved")}</p> : null}
          </div>
        ) : null}
        <p
          aria-label={T("edStatusLabel", { label })}
          className="m-0 flex flex-wrap gap-x-[var(--space-4)] border-t border-line bg-surface-alt px-[var(--space-3)] py-[var(--space-1)] text-sm text-ink-600"
        >
          <span>{T("edWords", { count: stats.words })}</span>
          <span>{T("edChars", { count: stats.characters })}</span>
          {stats.minutes > 0 ? <span>{T("edReading", { minutes: stats.minutes })}</span> : null}
        </p>
      </div>
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
      <p role="status" className="visually-hidden">
        <span key={status.nonce}>{status.value}</span>
      </p>

      <SlashMenu locale={locale} bridge={bridge} onActiveChange={onSlashActive} listId={slashListId} />

      {block ? (
        <BlockDialog
          key={`${block.mode}-${block.pos ?? "new"}-${block.type}`}
          type={block.type}
          mode={block.mode}
          initial={block.attrs}
          locale={locale}
          refs={liveRefs}
          onSubmit={applyBlock}
          onClose={() => closeOverlay("block")}
          onImageUploaded={(image) => setImages((cur) => (cur.some((i) => i.id === image.id) ? cur : [image, ...cur]))}
        />
      ) : null}

      {editor ? <LinkDialog key={linkTarget ? `${linkTarget.from}-${linkTarget.to}` : "closed"} editor={editor} target={linkTarget} lang={lang} locale={locale} onClose={() => closeOverlay("link")} /> : null}
      <ShortcutsDialog open={shortcutsOpen} onClose={() => closeOverlay("shortcuts")} locale={locale} mac={mac} />
      <ImageUploadDialog
        key={pasted ? pasted.name + pasted.size : "none"}
        file={pasted}
        locale={locale}
        storageConfigured={refs.storageConfigured}
        onClose={() => closeOverlay("pasted")}
        onUploaded={insertPastedImage}
      />
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
  const handles = { th: useRef<RichTextEditorHandle>(null), en: useRef<RichTextEditorHandle>(null) };
  const [pending, setPending] = useState<{ from: "th" | "en"; to: "th" | "en"; doc: RichTextDoc } | null>(null);
  const note = useStatusMessage<string>();

  const langName = (l: "th" | "en") => a(l === "th" ? "langThai" : "langEnglish", locale);

  function copy(from: "th" | "en", to: "th" | "en") {
    const source = handles[from].current?.getDoc();
    const target = handles[to].current?.getDoc();
    if (!source || isRichTextEmpty(source)) return note.show(a("edCopyNothing", locale, { source: langName(from) }));
    if (target && !isRichTextEmpty(target)) return setPending({ from, to, doc: source });
    finish(from, to, source);
  }

  function finish(from: "th" | "en", to: "th" | "en", doc: RichTextDoc) {
    handles[to].current?.setDoc(doc);
    setPending(null);
    note.show(a("edCopyDone", locale, { source: langName(from) }));
  }

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {(["th", "en"] as const).map((lang) => {
        const other = lang === "th" ? "en" : "th";
        return (
          <RichTextEditor
            key={lang}
            name={`${name}.${lang}`}
            lang={lang}
            label={`${label} (${langName(lang)})`}
            hint={hint}
            defaultValue={defaultValue?.[lang]}
            refs={refs}
            handleRef={handles[lang]}
            headerExtra={
              <Button type="button" variant="secondary" size="sm" icon={<ConsoleIcon name="rteCopy" />} onClick={() => copy(other, lang)}>
                {a(other === "th" ? "edCopyFromThai" : "edCopyFromEnglish", locale)}
              </Button>
            }
          />
        );
      })}
      <p role="status" className="visually-hidden">
        <span key={note.nonce}>{note.value}</span>
      </p>
      <PortalDialog open={pending !== null} onClose={() => setPending(null)} title={a("edCopyTitle", locale)} headingLevel={2} locale={locale} className="w-[min(100vw-2rem,30rem)]">
        {pending ? (
          <div className="flex flex-col gap-[var(--space-3)]">
            <p className="m-0">{a("edCopyBody", locale, { target: langName(pending.to), source: langName(pending.from) })}</p>
            <div className="flex flex-wrap gap-[var(--space-3)]">
              <Button type="button" onClick={() => finish(pending.from, pending.to, pending.doc)}>
                {a("edCopyConfirm", locale)}
              </Button>
              <Button type="button" variant="quiet" onClick={() => setPending(null)}>
                {a("cancel", locale)}
              </Button>
            </div>
          </div>
        ) : null}
      </PortalDialog>
    </div>
  );
}
