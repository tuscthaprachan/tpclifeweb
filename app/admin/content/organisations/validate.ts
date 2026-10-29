import { eq } from "drizzle-orm";
import { z } from "zod";
import { fieldKit, formDataToObject, parseForm, type FieldKit } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import { isSlugTaken } from "@/lib/admin/content/slug";
import type { AuditExecutor } from "@/lib/db/audit";
import { directoryOrganisations, faculties } from "@/lib/db/schema";
import type { OrganisationContactJson } from "@/lib/db/schema/content/directory";
import { DIRECTORY_ORGANISATION_SCOPES, DIRECTORY_ORGANISATION_TYPES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { rowsOf } from "./_shared/rows";

export const CONTACT_CHANNELS = ["instagram", "facebook", "line", "email", "phone", "website"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

const HANDLE = /^[A-Za-z0-9._-]{1,100}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "@tusu", "https://www.instagram.com/tusu/" and "tusu" all become "tusu". Null when it cannot be a handle. */
export function normaliseHandle(raw: string): string | null {
  let value = raw.trim();
  if (/^https?:\/\//i.test(value) || /^(www\.)?(instagram|facebook)\.com\//i.test(value)) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      value = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  }
  value = value.replace(/^@+/, "");
  return HANDLE.test(value) ? value : null;
}

/** Checks one contact's details against its channel and tidies them (handles bare, websites with https). `error` is set when it is not valid. */
export function checkContactValue(channel: ContactChannel, raw: string): { value: string; error?: AdminKey } {
  const value = raw.trim();
  switch (channel) {
    case "instagram":
    case "facebook": {
      const handle = normaliseHandle(value);
      return handle ? { value: handle } : { value, error: "dirErrHandle" };
    }
    case "email":
      return EMAIL.test(value) ? { value } : { value, error: "dirErrEmail" };
    case "phone":
      return /^[0-9+()\s.-]{5,30}$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 5 ? { value } : { value, error: "dirErrPhone" };
    case "line":
      return /^\S{1,100}$/.test(value) ? { value } : { value, error: "dirErrLineId" };
    case "website": {
      const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
      try {
        const url = new URL(withScheme);
        if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".") && withScheme.length <= 2048) return { value: withScheme };
      } catch {
        // falls through to the error
      }
      return { value, error: "errUrlInvalid" };
    }
  }
}

function contactRow(k: FieldKit, locale: Locale) {
  const L = (key: AdminKey) => a(key, locale);
  return z
    .object({
      channel: k.enumOf(L("dirFieldChannel"), CONTACT_CHANNELS),
      value: k.text(L("dirFieldContactValue"), { required: true, max: 300 }),
      label: k.bilingual(L("dirFieldContactLabel"), { max: 100 }),
    })
    .transform((row, ctx): OrganisationContactJson => {
      const channel = row.channel as ContactChannel;
      const checked = checkContactValue(channel, row.value);
      if (checked.error) {
        ctx.addIssue({ code: "custom", path: ["value"], message: a(checked.error, locale, { field: L("dirFieldContactValue").toLowerCase() }) });
      }
      return { channel, value: checked.value, ...(row.label.th || row.label.en ? { label: { th: row.label.th, en: row.label.en } } : {}) };
    });
}

/**
 * Everything a directory organisation form must satisfy, apart from writing
 * it. Split out of the Server Action so tests can run it against a database
 * without a signed-in session.
 */
export async function validateOrganisationForm(
  db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, id, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const schema = z.object({
    slug: k.slug(L("fieldSlug")),
    name: k.bilingual(L("dirFieldName"), { required: true, max: 150 }),
    type: k.enumOf(L("dirFieldType"), DIRECTORY_ORGANISATION_TYPES),
    faculty: k.bilingual(L("dirFieldFaculty"), { max: 150 }),
    facultyId: k.reference(L("dirFieldFacultyLink")),
    scope: k.enumOf(L("dirFieldScope"), DIRECTORY_ORGANISATION_SCOPES, { required: false }),
    programme: k.bilingual(L("dirFieldProgramme"), { max: 150 }),
    description: k.bilingual(L("dirFieldDescription"), { max: 1500 }),
    location: k.bilingual(L("dirFieldLocation"), { max: 200 }),
    isActive: k.checkbox(),
    contacts: rowsOf(contactRow(k, locale), { ignore: ["channel"], max: 20 }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const { facultyId, scope, programme } = parsed.data;
    if (facultyId) {
      const [found] = await db.select({ id: faculties.id }).from(faculties).where(eq(faculties.id, facultyId));
      if (!found) errors.facultyId = L("dirErrFacultyUnknown");
    } else if (scope || programme.th || programme.en) {
      errors.scope = L("dirErrScopeNeedsFaculty");
    }
    const taken = await isSlugTaken(db, {
      table: directoryOrganisations,
      slugColumn: directoryOrganisations.slug,
      idColumn: directoryOrganisations.id,
      slug: parsed.data.slug,
      excludeId: id ?? undefined,
    });
    if (taken) errors.slug = L("errSlugTaken");
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data, ...resolved };
}
