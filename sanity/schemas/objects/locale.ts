import { defineField, defineType } from "sanity";

/**
 * Bilingual field types.
 *
 * Every user-facing string in TryTPC exists in Thai and English, and
 * neither is a translation of the other. Thai is shown first because it is
 * the site's default locale.
 *
 * These object types deliberately carry NO validation of their own. A field
 * that is optional in `lib/sanity/types.ts` (for example `fare` on a shuttle
 * route) must be safe to leave completely empty, and Sanity checks a nested
 * required rule against every declared field whether or not its parent
 * object was ever touched. Baking `required()` into `th`/`en` here would
 * make every optional bilingual field mandatory everywhere it is used.
 *
 * Instead, the four message functions below are wired up explicitly at each
 * field usage site with `.custom()`, chained after `.required()` for fields
 * that are required in the type contract. Both reject a half-filled pair
 * (one language written, the other blank), which is the actual rule
 * CONTRIBUTING.md asks for: no half-translated document.
 *
 * Sanity infers the value handed to `.custom()` on an object field as
 * `Record<string, unknown> | undefined`, not the field's specific shape, so
 * that is the type these functions accept. They read `th`/`en` off it
 * defensively rather than trusting the shape.
 */

function readString(value: Record<string, unknown> | undefined, key: "th" | "en"): string {
  const raw = value?.[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function readBlockLength(value: Record<string, unknown> | undefined, key: "th" | "en"): number {
  const raw = value?.[key];
  return Array.isArray(raw) ? raw.length : 0;
}

/** Use with `.custom()` on a required `localeString` or `localeText` field. */
export function bilingualStringMessage(value: Record<string, unknown> | undefined): true | string {
  const th = readString(value, "th");
  const en = readString(value, "en");
  if (th && en) return true;
  if (!th && !en) return "Add both the Thai and English text.";
  return th ? "The English text is missing." : "The Thai text is missing.";
}

/** Use with `.custom()` on an optional `localeString` or `localeText` field. */
export function bilingualStringMessageOptional(
  value: Record<string, unknown> | undefined,
): true | string {
  const th = readString(value, "th");
  const en = readString(value, "en");
  if (Boolean(th) === Boolean(en)) return true;
  return th
    ? "Add the English text too, or clear the Thai text."
    : "Add the Thai text too, or clear the English text.";
}

/** Use with `.custom()` on a required `localeBlock` field. */
export function bilingualBlockMessage(value: Record<string, unknown> | undefined): true | string {
  const th = readBlockLength(value, "th");
  const en = readBlockLength(value, "en");
  if (th > 0 && en > 0) return true;
  if (th === 0 && en === 0) return "Add both the Thai and English content.";
  return th > 0 ? "The English content is missing." : "The Thai content is missing.";
}

/** Use with `.custom()` on an optional `localeBlock` field. */
export function bilingualBlockMessageOptional(
  value: Record<string, unknown> | undefined,
): true | string {
  const th = readBlockLength(value, "th");
  const en = readBlockLength(value, "en");
  if ((th > 0) === (en > 0)) return true;
  return th > 0
    ? "Add the English content too, or clear the Thai content."
    : "Add the Thai content too, or clear the English content.";
}

/**
 * A short bilingual string. Use for titles, labels and other single-line
 * text that appears in both languages.
 */
export const localeString = defineType({
  name: "localeString",
  title: "Text (Thai and English)",
  type: "object",
  options: { columns: 2 },
  fields: [
    defineField({
      name: "th",
      title: "Thai",
      type: "string",
    }),
    defineField({
      name: "en",
      title: "English",
      type: "string",
    }),
  ],
});

/**
 * A longer bilingual paragraph of plain text, no formatting. Use for
 * summaries and descriptions that do not need headings, links or lists.
 */
export const localeText = defineType({
  name: "localeText",
  title: "Paragraph (Thai and English)",
  type: "object",
  options: { columns: 2 },
  fields: [
    defineField({
      name: "th",
      title: "Thai",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "en",
      title: "English",
      type: "text",
      rows: 3,
    }),
  ],
});

/**
 * A longer bilingual rich text field, used for full page and post bodies.
 * Each language has its own independent set of paragraphs, headings and
 * lists, built with the shared `bodyPortableText` block content type.
 */
export const localeBlock = defineType({
  name: "localeBlock",
  title: "Rich text (Thai and English)",
  type: "object",
  options: { collapsible: true, collapsed: false },
  fields: [
    defineField({
      name: "th",
      title: "Thai",
      type: "bodyPortableText",
    }),
    defineField({
      name: "en",
      title: "English",
      type: "bodyPortableText",
    }),
  ],
});
