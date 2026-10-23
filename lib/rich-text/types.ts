/**
 * Rich text as stored in Postgres (`jsonb`): ProseMirror JSON, the format
 * TipTap reads and writes, so the phase 3 editor needs no conversion.
 * One document per language. Rendered by `RichText`, never as raw HTML.
 */

export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
}

export interface RichTextDoc {
  type: "doc";
  content: RichTextNode[];
}

export interface LocaleRichText {
  th: RichTextDoc;
  en: RichTextDoc;
}
