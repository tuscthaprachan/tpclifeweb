import type { RichTextDoc, RichTextNode } from "./types";

/**
 * The plain text of a rich text document, for the search index. Text nodes
 * only, with a space between blocks so the last word of one paragraph and the
 * first of the next do not run together. Custom blocks (callouts, steps,
 * contacts) hold their copy in attrs rather than text nodes and are not
 * indexed, the same as the Portable Text `pt::text` this replaces.
 */
export function richTextToPlainText(doc: RichTextDoc | null | undefined): string {
  const parts: string[] = [];
  const walk = (nodes: readonly RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "text" && node.text) parts.push(node.text);
      else if (node.type === "hardBreak") parts.push(" ");
      walk(node.content);
      // Keep blocks apart; inline text runs inside one paragraph stay joined.
      if (node.type !== "text" && node.content) parts.push(" ");
    }
  };
  walk(doc?.content);
  return parts.join("").replace(/\s+/g, " ").trim();
}
