import type { FieldErrors } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";
import type { Locale, LocaleString } from "@/lib/i18n/config";
import { textPlaceholders, type TextOverride, type TextOverrides } from "@/lib/i18n/editable";

/** The longest text one field takes. Generous: some built-in strings are whole paragraphs. */
export const SITE_TEXT_MAX = 4000;

/**
 * The Site text form posts the strings on screen as `k.<n>` (the full key)
 * with `v.<n>.th` and `v.<n>.en` (the wording), because keys contain dots.
 * Each posted string replaces its stored override: a language left blank or
 * matching the built-in text is not stored, so the site follows the default.
 * Strings not on screen keep their stored overrides. An edit must keep every
 * placeholder the built-in text uses, such as {name}.
 */
export function mergeSiteTextForm(input: {
  locale: Locale;
  formData: FormData;
  existing: TextOverrides;
  defaults: ReadonlyMap<string, LocaleString>;
}): { ok: true; texts: TextOverrides; changed: number } | { ok: false; errors: FieldErrors } {
  const { locale, formData, existing, defaults } = input;
  const texts: TextOverrides = { ...existing };
  const errors: FieldErrors = {};
  let changed = 0;

  for (const [name, raw] of formData.entries()) {
    const match = /^k\.(\d+)$/.exec(name);
    if (!match || typeof raw !== "string") continue;
    const index = match[1];
    const fallback = defaults.get(raw);
    if (!fallback) continue;

    const override: TextOverride = {};
    for (const lang of ["th", "en"] as const) {
      const field = `v.${index}.${lang}`;
      const posted = formData.get(field);
      const value = typeof posted === "string" ? posted.trim() : "";
      if (!value || value === fallback[lang].trim()) continue;
      if (value.length > SITE_TEXT_MAX) {
        errors[field] = a("sitErrTooLong", locale, { max: SITE_TEXT_MAX });
        continue;
      }
      const missing = textPlaceholders(fallback[lang]).filter((p) => !value.includes(p));
      if (missing.length > 0) {
        errors[field] = a("sitErrPlaceholders", locale, { list: missing.join(", ") });
        continue;
      }
      override[lang] = value;
    }

    const before = JSON.stringify(existing[raw] ?? {});
    if (override.th || override.en) texts[raw] = override;
    else delete texts[raw];
    if (JSON.stringify(texts[raw] ?? {}) !== before) changed += 1;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, texts, changed };
}
