import type { BlockType } from "@/lib/rich-text/editor";

/** What the link dialog starts from. */
export interface LinkTarget {
  from: number;
  to: number;
  text: string;
  href: string;
  /** The selection is already a link. */
  existing: boolean;
  /** The selection stays inside one block, so its words can be rewritten. */
  editableText: boolean;
}

/** The block dialog's subject: a new block of `type`, or the block at `pos`. */
export interface BlockTarget {
  type: BlockType;
  mode: "insert" | "edit";
  pos?: number;
  attrs: Record<string, unknown>;
}

/** The one thing laid over the editor, if any. Opening another replaces it. */
export type Overlay =
  | { kind: "none" }
  | { kind: "block"; block: BlockTarget }
  | { kind: "link"; target: LinkTarget }
  | { kind: "pasted"; file: File }
  | { kind: "shortcuts" }
  | { kind: "find" };

export type OverlayKind = Overlay["kind"];

/** `dirty` is true once the text has been edited since entering Markdown. */
export type EditorMode = { kind: "visual" } | { kind: "markdown"; md: string; error: string | null; dirty: boolean };

export interface EditorState {
  mode: EditorMode;
  /** Set while the Markdown converter loads for a mode switch. */
  busy: "markdown" | "visual" | null;
  overlay: Overlay;
  full: boolean;
  /** Bumped when Find is asked for while it is already open, so the query field takes focus again. */
  findFocus: number;
}

export type EditorEvent =
  | { type: "modeStart"; to: "markdown" | "visual" }
  | { type: "markdownReady"; md: string }
  | { type: "visualReady" }
  | { type: "modeFailed" }
  | { type: "markdownRejected"; error: string }
  | { type: "markdownEdited"; md: string }
  | { type: "markdownParsed" }
  | { type: "markdownInvalid"; error: string }
  | { type: "markdownReplaced"; md: string }
  | { type: "openBlock"; block: BlockTarget }
  | { type: "openLink"; target: LinkTarget }
  | { type: "openPasted"; file: File }
  | { type: "openShortcuts" }
  | { type: "openFind" }
  | { type: "toggleFind" }
  | { type: "close"; overlay?: OverlayKind }
  | { type: "toggleFull" }
  | { type: "escape" };

export const initialEditor: EditorState = { mode: { kind: "visual" }, busy: null, overlay: { kind: "none" }, full: false, findFocus: 0 };

const NONE: Overlay = { kind: "none" };

function open(state: EditorState, overlay: Overlay): EditorState {
  return state.mode.kind === "visual" ? { ...state, overlay } : state;
}

/** Pure transitions for the editor's mode, overlay and full screen state. Events that do not apply return the same state object. */
export function editorReducer(state: EditorState, event: EditorEvent): EditorState {
  switch (event.type) {
    case "modeStart":
      if (state.busy || state.mode.kind === event.to) return state;
      return { ...state, busy: event.to };
    case "markdownReady":
      return { ...state, busy: null, mode: { kind: "markdown", md: event.md, error: null, dirty: false }, overlay: NONE };
    case "visualReady":
      return { ...state, busy: null, mode: { kind: "visual" } };
    case "modeFailed":
      return state.busy ? { ...state, busy: null } : state;
    case "markdownRejected":
      return state.mode.kind === "markdown" ? { ...state, busy: null, mode: { ...state.mode, error: event.error } } : state;
    case "markdownEdited":
      return state.mode.kind === "markdown" ? { ...state, mode: { ...state.mode, md: event.md, dirty: true } } : state;
    case "markdownParsed":
      return state.mode.kind === "markdown" && state.mode.error !== null ? { ...state, mode: { ...state.mode, error: null } } : state;
    case "markdownInvalid":
      return state.mode.kind === "markdown" ? { ...state, mode: { ...state.mode, error: event.error } } : state;
    case "markdownReplaced":
      return state.mode.kind === "markdown" ? { ...state, mode: { kind: "markdown", md: event.md, error: null, dirty: false } } : state;
    case "openBlock":
      return open(state, { kind: "block", block: event.block });
    case "openLink":
      return open(state, { kind: "link", target: event.target });
    case "openPasted":
      return open(state, { kind: "pasted", file: event.file });
    case "openShortcuts":
      return open(state, { kind: "shortcuts" });
    case "openFind":
      if (state.mode.kind !== "visual") return state;
      return state.overlay.kind === "find" ? { ...state, findFocus: state.findFocus + 1 } : { ...state, overlay: { kind: "find" } };
    case "toggleFind":
      if (state.mode.kind !== "visual") return state;
      return { ...state, overlay: state.overlay.kind === "find" ? NONE : { kind: "find" } };
    case "close":
      if (state.overlay.kind === "none" || (event.overlay && event.overlay !== state.overlay.kind)) return state;
      return { ...state, overlay: NONE };
    case "toggleFull":
      return { ...state, full: !state.full };
    case "escape":
      if (state.overlay.kind !== "none") return { ...state, overlay: NONE };
      return state.full ? { ...state, full: false } : state;
  }
}

/** The change to say aloud between two states, or null. */
export type EditorAnnouncement = "visual" | "markdown" | "fullOn" | "fullOff";

/** What a screen reader should hear when moving from `prev` to `next`. A mode change wins over a full screen change. */
export function announcementFor(prev: EditorState, next: EditorState): EditorAnnouncement | null {
  if (prev.mode.kind !== next.mode.kind) return next.mode.kind;
  if (prev.full !== next.full) return next.full ? "fullOn" : "fullOff";
  return null;
}
