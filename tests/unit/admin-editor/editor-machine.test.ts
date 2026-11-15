import { describe, expect, it } from "vitest";
import { announcementFor, editorReducer, initialEditor, type EditorEvent, type EditorState, type LinkTarget } from "@/components/admin/content/rich-text/editor-machine";

const run = (events: EditorEvent[], from: EditorState = initialEditor) => events.reduce(editorReducer, from);
const target: LinkTarget = { from: 1, to: 3, text: "ab", href: "", existing: false, editableText: true };
const block = { type: "calloutBox" as const, mode: "insert" as const, attrs: {} };
const markdown = (...more: EditorEvent[]) => run([{ type: "modeStart", to: "markdown" }, { type: "markdownReady", md: "x" }, ...more]);

describe("editor mode", () => {
  it("is busy while the converter loads, then in Markdown clean", () => {
    const busy = run([{ type: "modeStart", to: "markdown" }]);
    expect(busy.busy).toBe("markdown");
    expect(editorReducer(busy, { type: "modeStart", to: "markdown" })).toBe(busy);
    expect(editorReducer(busy, { type: "modeStart", to: "visual" })).toBe(busy);
    expect(markdown().mode).toEqual({ kind: "markdown", md: "x", error: null, dirty: false });
    expect(markdown().busy).toBeNull();
  });

  it("ignores a switch to the mode it is already in", () => {
    expect(editorReducer(initialEditor, { type: "modeStart", to: "visual" })).toBe(initialEditor);
    const md = markdown();
    expect(editorReducer(md, { type: "modeStart", to: "markdown" })).toBe(md);
  });

  it("goes back to Visual after a round trip", () => {
    const back = run([{ type: "modeStart", to: "visual" }, { type: "visualReady" }], markdown());
    expect(back.mode).toEqual({ kind: "visual" });
    expect(back.busy).toBeNull();
  });

  it("clears busy when the converter fails to load", () => {
    const failed = run([{ type: "modeStart", to: "markdown" }, { type: "modeFailed" }]);
    expect(failed).toEqual(initialEditor);
    expect(editorReducer(initialEditor, { type: "modeFailed" })).toBe(initialEditor);
  });

  it("tracks edits, parse errors and recovery in Markdown", () => {
    const edited = markdown({ type: "markdownEdited", md: "y" });
    expect(edited.mode).toEqual({ kind: "markdown", md: "y", error: null, dirty: true });
    const bad = editorReducer(edited, { type: "markdownInvalid", error: "oops" });
    expect(bad.mode).toMatchObject({ error: "oops", dirty: true });
    expect(editorReducer(bad, { type: "markdownParsed" }).mode).toMatchObject({ error: null });
    expect(editorReducer(edited, { type: "markdownParsed" })).toBe(edited);
  });

  it("stays in Markdown with the error when going back to Visual is rejected", () => {
    const rejected = run([{ type: "modeStart", to: "visual" }, { type: "markdownRejected", error: "bad" }], markdown({ type: "markdownEdited", md: "y" }));
    expect(rejected.busy).toBeNull();
    expect(rejected.mode).toMatchObject({ kind: "markdown", error: "bad", dirty: true });
  });

  it("resets the text and dirty flag when the document is replaced", () => {
    const replaced = run([{ type: "markdownReplaced", md: "new" }], markdown({ type: "markdownEdited", md: "y" }));
    expect(replaced.mode).toEqual({ kind: "markdown", md: "new", error: null, dirty: false });
    expect(editorReducer(initialEditor, { type: "markdownReplaced", md: "n" })).toBe(initialEditor);
    expect(editorReducer(initialEditor, { type: "markdownEdited", md: "n" })).toBe(initialEditor);
  });

  it("closes find on the way into Markdown but not other overlays elsewhere", () => {
    const toMd = run([{ type: "openFind" }, { type: "modeStart", to: "markdown" }, { type: "markdownReady", md: "" }]);
    expect(toMd.overlay).toEqual({ kind: "none" });
  });

  it("opens no overlay while in Markdown", () => {
    const md = markdown();
    for (const event of [{ type: "openFind" }, { type: "toggleFind" }, { type: "openLink", target }, { type: "openBlock", block }, { type: "openShortcuts" }, { type: "openPasted", file: new File([], "a.png") }] as EditorEvent[]) {
      expect(editorReducer(md, event)).toBe(md);
    }
  });
});

describe("editor overlays", () => {
  it("has only one open at a time", () => {
    const link = run([{ type: "openFind" }, { type: "openLink", target }]);
    expect(link.overlay).toEqual({ kind: "link", target });
    expect(run([{ type: "openShortcuts" }], link).overlay).toEqual({ kind: "shortcuts" });
    const file = new File([], "a.png");
    expect(run([{ type: "openPasted", file }]).overlay).toEqual({ kind: "pasted", file });
    expect(run([{ type: "openBlock", block }]).overlay).toEqual({ kind: "block", block });
  });

  it("toggles find, and asks for the query to be refocused when it is already open", () => {
    const open = run([{ type: "toggleFind" }]);
    expect(open.overlay).toEqual({ kind: "find" });
    expect(editorReducer(open, { type: "toggleFind" }).overlay).toEqual({ kind: "none" });
    const again = editorReducer(open, { type: "openFind" });
    expect(again.overlay).toEqual({ kind: "find" });
    expect(again.findFocus).toBe(open.findFocus + 1);
    expect(run([{ type: "openFind" }]).findFocus).toBe(0);
  });

  it("closes only the overlay named, and nothing when there is none", () => {
    const link = run([{ type: "openLink", target }]);
    expect(editorReducer(link, { type: "close", overlay: "find" })).toBe(link);
    expect(editorReducer(link, { type: "close", overlay: "link" }).overlay).toEqual({ kind: "none" });
    expect(editorReducer(link, { type: "close" }).overlay).toEqual({ kind: "none" });
    expect(editorReducer(initialEditor, { type: "close" })).toBe(initialEditor);
  });
});

describe("editor full screen and Escape", () => {
  it("toggles full screen", () => {
    expect(run([{ type: "toggleFull" }]).full).toBe(true);
    expect(run([{ type: "toggleFull" }, { type: "toggleFull" }]).full).toBe(false);
  });

  it("closes the overlay first, then full screen, then does nothing", () => {
    const state = run([{ type: "toggleFull" }, { type: "openFind" }]);
    const first = editorReducer(state, { type: "escape" });
    expect(first.overlay).toEqual({ kind: "none" });
    expect(first.full).toBe(true);
    const second = editorReducer(first, { type: "escape" });
    expect(second.full).toBe(false);
    expect(editorReducer(second, { type: "escape" })).toBe(second);
  });

  it("keeps full screen through a mode round trip", () => {
    const state = run([{ type: "toggleFull" }, { type: "modeStart", to: "markdown" }, { type: "markdownReady", md: "" }, { type: "modeStart", to: "visual" }, { type: "visualReady" }]);
    expect(state.full).toBe(true);
    expect(state.mode).toEqual({ kind: "visual" });
  });
});

describe("announcementFor", () => {
  it("names mode and full screen changes and nothing else", () => {
    const md = markdown();
    expect(announcementFor(initialEditor, md)).toBe("markdown");
    expect(announcementFor(md, initialEditor)).toBe("visual");
    const full = run([{ type: "toggleFull" }]);
    expect(announcementFor(initialEditor, full)).toBe("fullOn");
    expect(announcementFor(full, initialEditor)).toBe("fullOff");
    expect(announcementFor(initialEditor, run([{ type: "openFind" }]))).toBeNull();
    expect(announcementFor(initialEditor, run([{ type: "modeStart", to: "markdown" }]))).toBeNull();
    expect(announcementFor(initialEditor, initialEditor)).toBeNull();
  });
});
