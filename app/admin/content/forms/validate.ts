import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { forms } from "@/lib/db/schema";
import { CATEGORIES, FORM_DESTINATIONS, OWNERS, SIGN_IN_TYPES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { bare, isBlankRow, prerequisites } from "../_pages/rows";

export const CONTACT_CHANNELS = ["line", "email", "phone", "inPerson", "url"] as const;

const EMAIL = /^(mailto:)?[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/i;

/**
 * Everything a form record's form must satisfy, apart from writing it. What
 * the destination address must look like depends on how the form is
 * completed, so it is checked after the rest has parsed.
 */
export async function validateFormRecordForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const contact = z.object({
    label: k.bilingual(L("formsFieldContactLabel"), { required: true, max: 200 }),
    channel: k.enumOf(L("blockContactChannel"), CONTACT_CHANNELS),
    value: k.text(L("formsFieldContactValue"), { required: true, max: 300 }),
    hours: k.bilingual(bare(L("blockContactHours")), { max: 200 }),
  });
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    purpose: k.bilingual(L("formsFieldPurpose"), { required: true, max: 300 }),
    description: k.bilingualRichText(bare(L("formsFieldDescription"))),
    category: k.enumOf(L("fieldCategory"), CATEGORIES),
    owner: k.enumOf(L("fieldOwner"), OWNERS),
    audience: k.bilingual(bare(L("formsFieldAudience")), { max: 500 }),
    prerequisites: prerequisites(k, L),
    requiresSignIn: k.checkbox(),
    signInType: k.enumOf(L("formsFieldSignInType"), SIGN_IN_TYPES, { required: false }),
    signInNote: k.bilingual(bare(L("formsFieldSignInNote")), { max: 500 }),
    destinationType: k.enumOf(L("formsFieldDestinationType"), FORM_DESTINATIONS),
    destinationUrl: k.nullableText(L("formsFieldDestinationUrl"), { max: 2048 }),
    estimatedMinutes: k.integer(L("formsFieldMinutes"), { min: 1, max: 600 }),
    turnaround: k.bilingual(bare(L("formsFieldTurnaround")), { max: 300 }),
    deadline: k.date(bare(L("formsFieldDeadline"))),
    contact: z.preprocess((v) => (isBlankRow(v) ? null : v), contact.nullable()),
    isActive: k.checkbox(),
    isPriority: k.checkbox(),
    lastVerified: k.date(L("formsFieldLastVerified")),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const data = parsed.data;
    const taken = await isSlugTaken(db, { table: forms, slugColumn: forms.slug, idColumn: forms.id, slug: data.slug, excludeId: id ?? undefined });
    if (taken) errors.slug = L("errSlugTaken");

    const label = L("formsFieldDestinationUrl");
    const raw = data.destinationUrl;
    let destinationUrl: string | null = null;
    if (data.destinationType !== "inPerson") {
      if (!raw) {
        if (publishing) errors.destinationUrl = a("errFieldRequired", locale, { field: label });
      } else if (data.destinationType === "email") {
        if (EMAIL.test(raw)) destinationUrl = raw;
        else errors.destinationUrl = L("formsErrDestinationEmail");
      } else {
        const url = k.url(label).safeParse(raw);
        if (url.success) destinationUrl = raw;
        else errors.destinationUrl = url.error.issues[0]?.message ?? a("errUrlInvalid", locale, { field: label });
      }
    }

    if (Object.keys(errors).length > 0) return { ok: false as const, errors };
    const signIn = data.requiresSignIn;
    return {
      ok: true as const,
      data: {
        ...data,
        destinationUrl,
        signInType: signIn ? data.signInType : null,
        signInNote: signIn ? data.signInNote : { th: "", en: "" },
      },
      ...resolved,
    };
  }

  return { ok: false as const, errors };
}
