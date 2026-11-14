import { Extension, type Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export interface FindMatch {
  from: number;
  to: number;
}

export interface FindState {
  query: string;
  caseSensitive: boolean;
  matches: FindMatch[];
  /** Index into `matches` of the one that is current. */
  current: number;
}

const EMPTY: FindState = { query: "", caseSensitive: false, matches: [], current: 0 };

export const findKey = new PluginKey<FindState>("richTextFind");

const lower = (ch: string) => {
  const l = ch.toLowerCase();
  return l.length === ch.length ? l : ch;
};

/** Every place `query` occurs inside one text block (a leaf node counts as a line break, so a match never spans one). */
export function findMatches(doc: PMNode, query: string, caseSensitive: boolean): FindMatch[] {
  if (!query) return [];
  const needle = caseSensitive ? query : [...query].map(lower).join("");
  const out: FindMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    const at: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText) {
        for (let i = 0; i < child.text!.length; i++) {
          const ch = child.text![i]!;
          text += caseSensitive ? ch : lower(ch);
          at.push(start + i);
        }
      } else {
        text += "\n";
        at.push(start);
      }
    });
    let from = text.indexOf(needle);
    while (from > -1) {
      out.push({ from: at[from]!, to: at[from + needle.length - 1]! + 1 });
      from = text.indexOf(needle, from + Math.max(1, needle.length));
    }
    return false;
  });
  return out;
}

export function getFindState(state: EditorState): FindState {
  return findKey.getState(state) ?? EMPTY;
}

export const FindReplace = Extension.create({
  name: "findReplace",
  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => EMPTY,
          apply(tr, prev, _old, next) {
            const patch = tr.getMeta(findKey) as Partial<FindState> | undefined;
            if (!patch && !tr.docChanged) return prev;
            const merged = { ...prev, ...patch };
            const rescan = tr.docChanged || (patch && ("query" in patch || "caseSensitive" in patch));
            const matches = rescan ? findMatches(next.doc, merged.query, merged.caseSensitive) : prev.matches;
            const current = matches.length === 0 ? 0 : Math.min(patch && "current" in patch ? patch.current! : merged.current, matches.length - 1);
            return { ...merged, matches, current };
          },
        },
        props: {
          decorations(state) {
            const { matches, current } = getFindState(state);
            if (matches.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === current ? "rt-find-match rt-find-current" : "rt-find-match" })),
            );
          },
        },
      }),
    ];
  },
});

function patch(editor: Editor, change: Partial<FindState>) {
  editor.view.dispatch(editor.state.tr.setMeta(findKey, change));
}

function reveal(editor: Editor) {
  const { matches, current } = getFindState(editor.state);
  const match = matches[current];
  if (!match) return;
  const { node } = editor.view.domAtPos(match.from);
  (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement)?.scrollIntoView({ block: "center", behavior: "auto" });
}

export function setFind(editor: Editor, change: { query?: string; caseSensitive?: boolean }) {
  patch(editor, { ...change, current: 0 });
  reveal(editor);
}

export function clearFind(editor: Editor) {
  patch(editor, { query: "", current: 0 });
}

export function stepFind(editor: Editor, by: 1 | -1) {
  const { matches, current } = getFindState(editor.state);
  if (matches.length === 0) return;
  patch(editor, { current: (current + by + matches.length) % matches.length });
  reveal(editor);
}

export function replaceCurrent(editor: Editor, replacement: string): boolean {
  const { matches, current } = getFindState(editor.state);
  const match = matches[current];
  if (!match) return false;
  editor.view.dispatch(editor.state.tr.insertText(replacement, match.from, match.to));
  reveal(editor);
  return true;
}

/** Replaces every match in one step, so one undo puts them all back. Returns how many. */
export function replaceAll(editor: Editor, replacement: string): number {
  const { matches } = getFindState(editor.state);
  if (matches.length === 0) return 0;
  const tr = editor.state.tr;
  for (const m of [...matches].reverse()) tr.insertText(replacement, m.from, m.to);
  editor.view.dispatch(tr);
  return matches.length;
}
