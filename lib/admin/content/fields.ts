import { z } from "zod";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { parseRichTextDoc, isRichTextEmpty, isSafeHref } from "@/lib/rich-text/schema";
import type { RichTextDoc } from "@/lib/rich-text/types";
import { isCalendarDate, parseBangkokDateTime } from "./datetime";
import type { FieldErrors } from "./form-state";
import { SLUG_MAX, SLUG_PATTERN } from "./slug";

/**
 * Form parsing for content Server Actions. A form posts flat `FormData`;
 * `formDataToObject` turns dotted names into the nested shape a Zod schema
 * describes ("title.th" becomes `{ title: { th } }`, "tags.0.en" becomes
 * `{ tags: [{ en }] }`), `fieldKit` builds the field schemas with their error
 * messages already in the staff member's language, and `parseForm` returns
 * the per-field errors the form shell shows.
 *
 *   const k = fieldKit(locale, publishing);
 *   const schema = z.object({ title: k.bilingual(a("fieldTitle", locale), { required: true }) });
 *   const parsed = parseForm(schema, formDataToObject(formData));
 */

const ARRAY_KEY = /^\d+$/;

function setPath(target: Record<string, unknown>, path: string[], value: unknown): void {
  let node: Record<string, unknown> = target;
  path.forEach((part, i) => {
    if (i === path.length - 1) {
      node[part] = value;
    } else {
      const next = node[part];
      node = typeof next === "object" && next !== null ? (next as Record<string, unknown>) : (node[part] = {}) as Record<string, unknown>;
    }
  });
}

/** Objects whose keys are all numbers become arrays, in numeric order, with gaps closed up (a removed row leaves no hole). */
function arrayify(value: unknown): unknown {
  if (typeof value !== "object" || value === null || value instanceof File) return value;
  if (Array.isArray(value)) return value.map(arrayify);
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 0 && entries.every(([k]) => ARRAY_KEY.test(k))) {
    return entries.sort(([x], [y]) => Number(x) - Number(y)).map(([, v]) => arrayify(v));
  }
  return Object.fromEntries(entries.map(([k, v]) => [k, arrayify(v)]));
}

/** Repeated names (checkbox groups) become arrays; Next's internal `$ACTION_` fields are left out. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const grouped = new Map<string, FormDataEntryValue[]>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  const out: Record<string, unknown> = {};
  for (const [key, values] of grouped) setPath(out, key.split("."), values.length > 1 ? values : values[0]);
  return arrayify(out) as Record<string, unknown>;
}

export type ParsedForm<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

/** Runs `schema`; on failure returns the first message for each field path. */
export function parseForm<S extends z.ZodType>(schema: S, input: unknown): ParsedForm<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    errors[path] ??= issue.message;
  }
  return { ok: false, errors };
}

/** "Title" to "title" for use mid-sentence in English; acronyms ("URL") and Thai are left alone. */
function inSentence(label: string, locale: Locale): string {
  if (locale !== "en" || /^[A-Z]{2}/.test(label)) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
}

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const text = (v: unknown): string => asString(v).trim();

export interface TextOptions {
  max?: number;
  required?: boolean;
  /** Store null rather than "" when left empty. */
  nullable?: boolean;
}

export interface BilingualOptions extends Omit<TextOptions, "nullable"> {
  /**
   * `required`: at least one language in a draft, both once published.
   * Not required: both or neither once published, anything in a draft.
   */
  required?: boolean;
}

/**
 * Field schemas with messages in `locale`. `publishing` is whether the row
 * will be live after this save: the bilingual completeness rule (published
 * content needs both languages, drafts may be incomplete) turns on with it.
 */
export function fieldKit(locale: Locale, publishing: boolean) {
  const msg = (key: AdminKey, label: string, extra?: Record<string, string | number>) =>
    a(key, locale, { field: inSentence(label, locale), ...extra });
  const langName = { th: a("langThai", locale), en: a("langEnglish", locale) } as const;

  /** Shared completeness rule for a th/en pair of already-parsed values. */
  function checkPair(
    ctx: z.RefinementCtx,
    label: string,
    pair: { th: boolean; en: boolean },
    required: boolean,
  ): void {
    const missing = (["th", "en"] as const).filter((l) => !pair[l]);
    if (missing.length === 0) return;
    if (!publishing) {
      if (required && missing.length === 2) {
        ctx.addIssue({ code: "custom", path: ["th"], message: msg("errFieldRequired", label) });
      }
      return;
    }
    if (!required && missing.length === 2) return;
    for (const l of missing) {
      ctx.addIssue({ code: "custom", path: [l], message: msg("errFieldRequiredIn", label, { language: langName[l] }) });
    }
  }

  const textSchema = (label: string, { max = 200, required = false, nullable = false }: TextOptions = {}) =>
    z.preprocess(text, z.string()).superRefine((value, ctx) => {
      if (required && !value) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
      if (value.length > max) ctx.addIssue({ code: "custom", message: msg("errFieldTooLong", label, { max }) });
    }).transform((value) => (nullable && !value ? null : value)) as z.ZodType<string | null>;

  const richText = (label: string, { required = false }: { required?: boolean } = {}) =>
    z
      .preprocess(
        asString,
        z.string().transform((raw, ctx): RichTextDoc => {
          const empty: RichTextDoc = { type: "doc", content: [] };
          if (!raw.trim()) return empty;
          try {
            return parseRichTextDoc(JSON.parse(raw));
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            ctx.addIssue({ code: "custom", message: msg("errRichTextInvalid", label, { detail }) });
            return z.NEVER;
          }
        }),
      )
      .superRefine((doc, ctx) => {
        if (required && isRichTextEmpty(doc as RichTextDoc)) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
      }) as z.ZodType<RichTextDoc>;

  return {
    /** A single-language line or paragraph of text. */
    text(label: string, options: TextOptions = {}) {
      return textSchema(label, options) as z.ZodType<string>;
    },

    /** Same, returning null when empty. */
    nullableText(label: string, options: Omit<TextOptions, "nullable"> = {}) {
      return textSchema(label, { ...options, nullable: true });
    },

    /** Thai and English text: form names `<name>.th` and `<name>.en`. */
    bilingual(label: string, { max = 200, required = false }: BilingualOptions = {}) {
      const one = (l: "th" | "en") =>
        z.preprocess(text, z.string().max(max, msg("errFieldTooLong", `${label} (${langName[l]})`, { max })));
      return z
        .preprocess((v) => v ?? {}, z.object({ th: one("th"), en: one("en") }))
        .superRefine((v, ctx) => checkPair(ctx, label, { th: v.th !== "", en: v.en !== "" }, required)) as z.ZodType<{
        th: string;
        en: string;
      }>;
    },

    /** One rich text document posted as a JSON string. Rejected by `parseRichTextDoc` if it strays from the vocabulary. */
    richText,

    /** Rich text in both languages: hidden inputs `<name>.th` and `<name>.en`. */
    bilingualRichText(label: string, { required = false }: { required?: boolean } = {}) {
      const doc = richText(label);
      return z
        .preprocess((v) => v ?? {}, z.object({ th: doc, en: doc }))
        .superRefine((v, ctx) => checkPair(ctx, label, { th: !isRichTextEmpty(v.th), en: !isRichTextEmpty(v.en) }, required)) as z.ZodType<{
        th: RichTextDoc;
        en: RichTextDoc;
      }>;
    },

    /** An http(s) address, or null when empty. */
    url(label: string, { required = false }: { required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): string | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
          return null;
        }
        let ok = false;
        try {
          ok = ["http:", "https:"].includes(new URL(value).protocol) && value.length <= 2048;
        } catch {
          ok = false;
        }
        if (!ok) ctx.addIssue({ code: "custom", message: msg("errUrlInvalid", label) });
        return value;
      }) as z.ZodType<string | null>;
    },

    /** A site link: http(s), mailto, tel or a path on this site. */
    href(label: string, { required = false }: { required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): string | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
          return null;
        }
        if (!isSafeHref(value)) ctx.addIssue({ code: "custom", message: msg("errUrlInvalid", label) });
        return value;
      }) as z.ZodType<string | null>;
    },

    /** A `datetime-local` value read as Bangkok time; null when empty. */
    dateTime(label: string, { required = false }: { required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): Date | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
          return null;
        }
        const date = parseBangkokDateTime(value);
        if (!date) ctx.addIssue({ code: "custom", message: msg("errDateInvalid", label) });
        return date;
      }) as z.ZodType<Date | null>;
    },

    /** A calendar date "YYYY-MM-DD"; null when empty. */
    date(label: string, { required = false }: { required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): string | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
          return null;
        }
        if (!isCalendarDate(value)) ctx.addIssue({ code: "custom", message: msg("errDateInvalid", label) });
        return value;
      }) as z.ZodType<string | null>;
    },

    /** One of `values`. Optional enums give null when empty. */
    enumOf<const V extends readonly [string, ...string[]]>(label: string, values: V, { required = true }: { required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): V[number] | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: msg("errSelectField", label) });
          return null;
        }
        if (!(values as readonly string[]).includes(value)) ctx.addIssue({ code: "custom", message: msg("errSelectField", label) });
        return value as V[number];
      }) as z.ZodType<V[number] | null>;
    },

    /** A lowercase, hyphenated URL slug. Uniqueness is checked separately with `isSlugTaken`. */
    slug(label: string) {
      return z.preprocess(text, z.string()).superRefine((value, ctx) => {
        if (!value) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
        else if (value.length > SLUG_MAX || !SLUG_PATTERN.test(value)) ctx.addIssue({ code: "custom", message: msg("errSlugFormat", label) });
      }) as z.ZodType<string>;
    },

    /** The id of another row; null when none is chosen. */
    reference(label: string, { required = false }: { required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): string | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: msg("errSelectField", label) });
          return null;
        }
        if (!z.uuid().safeParse(value).success) ctx.addIssue({ code: "custom", message: msg("errSelectField", label) });
        return value;
      }) as z.ZodType<string | null>;
    },

    /** Zero or more row ids, in the order posted. Duplicates are dropped. */
    references(label: string, { max = 100 }: { max?: number } = {}) {
      return z
        .preprocess((v) => (Array.isArray(v) ? v : v === undefined || v === "" ? [] : [v]), z.array(z.string()))
        .transform((values, ctx): string[] => {
          const ids = [...new Set(values.map(text).filter(Boolean))];
          if (ids.length > max || ids.some((id) => !z.uuid().safeParse(id).success)) {
            ctx.addIssue({ code: "custom", message: msg("errSelectField", label) });
          }
          return ids;
        }) as z.ZodType<string[]>;
    },

    /** A checkbox: present means true. */
    checkbox() {
      return z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()) as z.ZodType<boolean>;
    },

    /** A whole number, or null when empty. */
    integer(label: string, { min, max, required = false }: { min?: number; max?: number; required?: boolean } = {}) {
      return z.preprocess(text, z.string()).transform((value, ctx): number | null => {
        if (!value) {
          if (required) ctx.addIssue({ code: "custom", message: msg("errFieldRequired", label) });
          return null;
        }
        const n = Number(value);
        if (!Number.isInteger(n) || (min !== undefined && n < min) || (max !== undefined && n > max)) {
          ctx.addIssue({ code: "custom", message: msg("errNumberInvalid", label) });
        }
        return n;
      }) as z.ZodType<number | null>;
    },
  };
}

export type FieldKit = ReturnType<typeof fieldKit>;
