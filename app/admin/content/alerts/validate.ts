import { z } from "zod";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { resolveIntent, type FieldErrors, type ResolvedIntent } from "@/lib/admin/content/form-state";
import type { AuditExecutor } from "@/lib/db/audit";
import { ALERT_SEVERITIES, ALERT_SURFACES, type ContentStatus } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * Everything a service alert form must satisfy, apart from writing it. Split
 * out of the Server Action so tests can run it without a signed-in session.
 */
export async function validateAlertForm(
  _db: AuditExecutor,
  input: { locale: Locale; id: string | null; formData: FormData; existingStatus?: ContentStatus },
) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);
  const resolved: ResolvedIntent = resolveIntent(formData, input.existingStatus);
  const { publishing } = resolved;

  const k = fieldKit(locale, publishing);
  const schema = z.object({
    title: k.bilingual(L("fieldTitle"), { required: true, max: 200 }),
    body: k.bilingual(L("alertsFieldBody"), { required: true, max: 1000 }),
    severity: k.enumOf(L("alertsFieldSeverity"), ALERT_SEVERITIES),
    affects: z
      .preprocess((v) => (Array.isArray(v) ? v : v === undefined || v === "" ? [] : [v]), z.array(z.string()))
      .transform((values, ctx) => {
        const known = new Set<string>(ALERT_SURFACES);
        const picked = ALERT_SURFACES.filter((s) => values.includes(s));
        if (values.some((v) => !known.has(v))) ctx.addIssue({ code: "custom", message: a("errSelectField", locale, { field: L("alertsFieldAffects") }) });
        return picked;
      }),
    startsAt: k.dateTime(L("alertsFieldStartsAt"), { required: true }),
    endsAt: k.dateTime(L("alertsFieldEndsAt")),
    moreInfoUrl: k.url(L("alertsFieldMoreInfo")),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  const errors: FieldErrors = parsed.ok ? {} : { ...parsed.errors };

  if (parsed.ok) {
    const { startsAt, endsAt } = parsed.data;
    if (startsAt && endsAt && endsAt < startsAt) errors.endsAt = L("alertsErrEndsBeforeStart");
  }

  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data, ...resolved };
}

/** The columns a validated alert form writes. */
export function alertValues(data: Extract<Awaited<ReturnType<typeof validateAlertForm>>, { ok: true }>["data"]) {
  return {
    titleTh: data.title.th,
    titleEn: data.title.en,
    bodyTh: data.body.th,
    bodyEn: data.body.en,
    severity: data.severity,
    affects: data.affects,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    moreInfoUrl: data.moreInfoUrl,
  };
}
