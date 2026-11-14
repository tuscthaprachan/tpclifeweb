import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import type { ConsoleIconName } from "@/components/admin/icons";

export interface SlashItem {
  id: string;
  label: string;
  /** Lower-case words the filter also matches, in both languages. */
  keywords: string;
  icon: ConsoleIconName;
  run: (editor: Editor, range: Range) => void;
}

export interface SlashBridge {
  onStart: (props: SuggestionProps<SlashItem, SlashItem>) => void;
  onUpdate: (props: SuggestionProps<SlashItem, SlashItem>) => void;
  onExit: () => void;
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * "/" at the start of an empty top-level paragraph opens a filterable list of
 * things to insert. The list itself is drawn by React (`SlashMenu`), which
 * installs its handlers on `bridge.current`.
 */
export function slashExtension(bridge: { slash: SlashBridge | null; items: (query: string) => SlashItem[] }) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem, SlashItem>({
          editor: this.editor,
          char: "/",
          startOfLine: true,
          allowSpaces: false,
          allow: ({ state, range }) => {
            const $from = state.doc.resolve(range.from);
            return $from.depth === 1 && $from.parent.type.name === "paragraph" && $from.parent.textContent === state.doc.textBetween(range.from, range.to);
          },
          items: ({ query }) => bridge.items(query),
          command: ({ editor, range, props }) => props.run(editor, range),
          render: () => ({
            onStart: (props) => bridge.slash?.onStart(props),
            onUpdate: (props) => bridge.slash?.onUpdate(props),
            onExit: () => bridge.slash?.onExit(),
            onKeyDown: ({ event }: SuggestionKeyDownProps) => bridge.slash?.onKeyDown(event) ?? false,
          }),
        }),
      ];
    },
  });
}
