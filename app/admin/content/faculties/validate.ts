import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { faculties } from "@/lib/db/schema";
import type { ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { checkContactValue } from "../organisations/validate";

/**
 * Everything a faculty form must satisfy, apart from writing it. Split out of
 * the Server Action so tests can run it against a database without a
 * signed-in session. Every office field is optional.
 */
export async function validateFacultyForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);

  const k = fieldKit(locale, resolved.publishing);
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    name: k.bilingual(L("dirFieldName"), { required: true, max: 150 }),
    sortOrder: k.integer(L("facFieldSortOrder"), { min: 0, max: 9999 }),
    location: k.bilingual(L("facFieldOfficeLocation"), { max: 300 }),
    phone: k.text(L("facFieldOfficePhone"), { max: 60 }),
    email: k.text(L("facFieldOfficeEmail"), { max: 254 }),
    website: k.url(L("facFieldOfficeWebsite")),
    note: k.bilingual(L("facFieldOfficeNote"), { max: 500 }),
  });

  const raw = formDataToObject(formData);
  const parsed = parseForm(schema, raw);
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  // The phone and email are checked even when another field failed, so every problem is reported at once.
  const contact = (field: "phone" | "email"): string | null => {
    const value = (parsed.ok ? parsed.data[field] : String(raw[field] ?? "")).trim();
    if (!value) return null;
    const checked = checkContactValue(field, value);
    if (checked.error) {
      errors[field] = a(checked.error, locale, { field: L(field === "phone" ? "facFieldOfficePhone" : "facFieldOfficeEmail").toLowerCase() });
      return null;
    }
    return checked.value;
  };
  const phone = contact("phone");
  const email = contact("email");

  if (parsed.ok) {
    const taken = await isSlugTaken(db, {
      table: faculties,
      slugColumn: faculties.slug,
      idColumn: faculties.id,
      slug: parsed.data.slug,
      excludeId: id ?? undefined,
    });
    if (taken) errors.slug = L("errSlugTaken");
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: { ...parsed.data, phone, email }, ...resolved };
}
