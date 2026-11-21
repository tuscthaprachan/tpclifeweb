import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import { SERVICE_PAGE_KEYS, SERVICE_PAGES, listItems, placeholders, serviceTextKey, type ServiceTextField } from "@/lib/content/service-pages";
import type { ServiceTextOverrideJson } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";

/** Tidies a value for comparison and storage: trimmed, and for a list one trimmed item per line. */
export function normaliseServiceText(def: Pick<ServiceTextField, "list">, value: string): string {
  return def.list ? listItems(value).join("\n") : value.trim();
}

/**
 * Everything the Service pages form must satisfy. Form names are
 * `t.<page>.<field>.th|en`. A field left blank, or matching the built-in
 * text, is not stored, so the site keeps following the default. An edited
 * field must keep the default's placeholders, such as {loan}.
 */
export function validateServicePagesForm(input: { locale: Locale; formData: FormData }) {
  const { locale, formData } = input;
  const k = fieldKit(locale, false);

  const pageShape = (page: (typeof SERVICE_PAGE_KEYS)[number]) => {
    const fields: Record<string, ServiceTextField> = SERVICE_PAGES[page].fields;
    return z.object(Object.fromEntries(Object.entries(fields).map(([field, def]) => [field, k.bilingual(pick(def.label, locale), { max: def.max })])));
  };
  const schema = z.object({ t: z.object(Object.fromEntries(SERVICE_PAGE_KEYS.map((page) => [page, pageShape(page)]))) });

  const parsed = parseForm(schema, formDataToObject(formData));
  if (!parsed.ok) return { ok: false as const, errors: parsed.errors };

  const errors: FieldErrors = {};
  const texts: Record<string, ServiceTextOverrideJson> = {};
  for (const page of SERVICE_PAGE_KEYS) {
    const fields: Record<string, ServiceTextField> = SERVICE_PAGES[page].fields;
    for (const [field, def] of Object.entries(fields)) {
      const posted = (parsed.data.t[page] as Record<string, { th: string; en: string }>)[field];
      const override: ServiceTextOverrideJson = {};
      for (const lang of ["th", "en"] as const) {
        const value = normaliseServiceText(def, posted?.[lang] ?? "");
        if (!value || value === normaliseServiceText(def, def.fallback[lang])) continue;
        const needed = placeholders(def.fallback[lang]);
        const have = placeholders(value);
        if (!needed.every((p) => have.includes(p))) {
          errors[`t.${page}.${field}.${lang}`] = a("svpErrPlaceholders", locale, { label: pick(def.label, locale), list: needed.join(", ") });
          continue;
        }
        override[lang] = value;
      }
      if (override.th || override.en) texts[serviceTextKey(page, field)] = override;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: { texts } };
}
