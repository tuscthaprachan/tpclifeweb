import { Node, mergeAttributes, type AnyExtension, type Extensions } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import { ListItem } from "@tiptap/extension-list";
import { StarterKit } from "@tiptap/starter-kit";
import { BLOCK_DEFAULTS, type BlockType } from "./editor";
import { CUSTOM_NODES, HEADING_LEVELS, isSafeHref } from "./schema";

/**
 * The TipTap extensions for the stored vocabulary, and nothing else: the
 * editor cannot produce a node or mark that `parseRichTextDoc` would refuse.
 * No React in here, so the same list builds the ProseMirror schema in tests.
 * The editor component adds a node view to each custom block with
 * `.extend({ addNodeView })` (see components/admin/content/RichTextEditor).
 */

/** Quotes hold plain paragraphs and lists only, as the stored schema requires. */
const RestrictedBlockquote = Blockquote.extend({ content: "(paragraph | bulletList | orderedList)+" });

/** A list item is a paragraph then optional nested lists; no headings or custom blocks inside lists. */
const RestrictedListItem = ListItem.extend({ content: "paragraph (bulletList | orderedList)*" });

/**
 * A custom block is a leaf node whose attrs are the schema's attrs, kept
 * whole (the nested `{ th, en }` objects included). `data-attrs` lets a copied
 * block paste back in intact.
 */
function customBlock(name: BlockType) {
  const defaults = BLOCK_DEFAULTS[name] as Record<string, unknown>;
  return Node.create({
    name,
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,
    addAttributes() {
      return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { default: value, rendered: false }]));
    },
    parseHTML() {
      return [
        {
          tag: `div[data-rt-block="${name}"]`,
          getAttrs: (el) => {
            try {
              return JSON.parse((el as HTMLElement).dataset.attrs ?? "{}") as Record<string, unknown>;
            } catch {
              return false;
            }
          },
        },
      ];
    },
    renderHTML({ node, HTMLAttributes }) {
      return ["div", mergeAttributes(HTMLAttributes, { "data-rt-block": name, "data-attrs": JSON.stringify(node.attrs) })];
    },
  });
}

export const customBlockNodes = CUSTOM_NODES.map(customBlock);

/**
 * The core vocabulary plus the six custom blocks. The editor passes its own
 * versions of the blocks, extended with a React node view.
 */
export function richTextExtensions(blocks: readonly AnyExtension[] = customBlockNodes): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [...HEADING_LEVELS] },
      blockquote: false,
      listItem: false,
      strike: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      underline: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => isSafeHref(url),
      },
    }),
    RestrictedBlockquote,
    RestrictedListItem,
    ...blocks,
  ];
}
