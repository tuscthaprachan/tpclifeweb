import { z } from "zod";
import { fieldKit, formDataToObject, parseForm, type FieldKit } from "@/lib/admin/content/fields";
import type { FieldErrors } from "@/lib/admin/content/form-state";
import { MAX_HOME_TASKS } from "@/lib/content/home-tasks";
import type { ExternalLinkJson, HelpContactJson, HomeTaskJson, NavItemJson } from "@/lib/db/schema/content/common";
import { SERVICE_PHASES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { rowsOf } from "../organisations/_shared/rows";

export const HELP_CHANNELS = ["line", "email", "phone", "inPerson", "url"] as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATH = /^\/$|^\/[A-Za-z0-9._~%-]+(\/[A-Za-z0-9._~%-]+)*$/;

/** True for a page address the menus can use: starts with "/", has no language prefix and no trailing "/". */
export function isNavPath(path: string): boolean {
  if (!PATH.test(path)) return false;
  const first = path.split("/")[1];
  return !(LOCALES as readonly string[]).includes(first ?? "");
}

function navRow(k: FieldKit, locale: Locale, labelKey: AdminKey) {
  const L = (key: AdminKey) => a(key, locale);
  return z
    .object({
      label: k.bilingual(L(labelKey), { required: true, max: 80 }),
      path: k.text(L("siteFieldNavPath"), { required: true, max: 200 }),
    })
    .superRefine((row, ctx) => {
      if (row.path && !isNavPath(row.path)) ctx.addIssue({ code: "custom", path: ["path"], message: L("siteErrNavPath") });
    })
    .transform((row): NavItemJson => ({ label: { th: row.label.th, en: row.label.en }, path: row.path }));
}

function homeTaskRow(k: FieldKit, locale: Locale) {
  const L = (key: AdminKey) => a(key, locale);
  return z
    .object({
      label: k.bilingual(L("siteFieldHomeTaskLabel"), { required: true, max: 45 }),
      description: k.bilingual(L("siteFieldHomeTaskDescription"), { required: true, max: 120 }),
      path: k.text(L("siteFieldNavPath"), { required: true, max: 200 }),
    })
    .superRefine((row, ctx) => {
      if (row.path && !isNavPath(row.path)) ctx.addIssue({ code: "custom", path: ["path"], message: L("siteErrNavPath") });
    })
    .transform(
      (row): HomeTaskJson => ({
        label: { th: row.label.th, en: row.label.en },
        description: { th: row.description.th, en: row.description.en },
        path: row.path,
      }),
    );
}

function helpRow(k: FieldKit, locale: Locale) {
  const L = (key: AdminKey) => a(key, locale);
  const web = k.url(L("siteFieldHelpValue"), { required: true });
  return z
    .object({
      label: k.bilingual(L("siteFieldHelpLabel"), { required: true, max: 120 }),
      channel: k.enumOf(L("dirFieldChannel"), HELP_CHANNELS),
      value: k.text(L("siteFieldHelpValue"), { required: true, max: 500 }),
      hours: k.bilingual(L("siteFieldHelpHours"), { max: 200 }),
    })
    .superRefine((row, ctx) => {
      const bad = (key: AdminKey) => ctx.addIssue({ code: "custom", path: ["value"], message: L(key) });
      if (!row.value) return;
      switch (row.channel) {
        case "email":
          if (!EMAIL.test(row.value)) bad("dirErrEmail");
          break;
        case "phone":
          if (!/^[0-9+()\s.-]{5,30}$/.test(row.value) || (row.value.match(/\d/g)?.length ?? 0) < 5) bad("dirErrPhone");
          break;
        case "line":
        case "url":
          if (!web.safeParse(row.value).success || !/^https?:\/\//i.test(row.value)) bad("siteErrHelpLink");
          break;
      }
    })
    .transform(
      (row): HelpContactJson => ({
        label: { th: row.label.th, en: row.label.en },
        channel: row.channel!,
        value: row.value,
        ...(row.hours.th || row.hours.en ? { hours: { th: row.hours.th, en: row.hours.en } } : {}),
      }),
    );
}

function linkRow(k: FieldKit, locale: Locale) {
  const L = (key: AdminKey) => a(key, locale);
  return z
    .object({
      label: k.bilingual(L("siteFieldHelpLabel"), { required: true, max: 150 }),
      url: k.url(L("siteFieldLinkUrl"), { required: true }),
      description: k.bilingual(L("siteFieldLinkDescription"), { max: 300 }),
      requiresSignIn: k.checkbox(),
    })
    .transform(
      (row): ExternalLinkJson => ({
        label: { th: row.label.th, en: row.label.en },
        url: row.url!,
        ...(row.description.th || row.description.en ? { description: { th: row.description.th, en: row.description.en } } : {}),
        ...(row.requiresSignIn ? { requiresSignIn: true } : {}),
      }),
    );
}

/**
 * Everything the site settings form must satisfy, apart from writing it. The
 * settings are always live, so both languages are required throughout.
 */
export function validateSiteSettingsForm(input: { locale: Locale; formData: FormData }) {
  const { locale, formData } = input;
  const L = (key: AdminKey) => a(key, locale);

  const k = fieldKit(locale, true);
  const schema = z.object({
    serviceName: k.bilingual(L("siteFieldServiceName"), { required: true, max: 100 }),
    tagline: k.bilingual(L("siteFieldTagline"), { required: true, max: 250 }),
    phase: k.enumOf(L("siteFieldPhase"), SERVICE_PHASES),
    phaseNote: k.bilingual(L("siteFieldPhaseNote"), { max: 300 }),
    primaryNav: rowsOf(navRow(k, locale, "siteFieldNavLabel"), { max: 12 }),
    footerNav: rowsOf(navRow(k, locale, "siteFieldNavLabel"), { max: 12 }),
    homeTasks: rowsOf(homeTaskRow(k, locale), {
      max: MAX_HOME_TASKS,
      after: (rows, add) => {
        const extra = rows[MAX_HOME_TASKS];
        if (extra) add(extra.index, "path", a("siteErrHomeTasksMax", locale, { max: MAX_HOME_TASKS }));
      },
    }),
    helpContacts: rowsOf(helpRow(k, locale), { ignore: ["channel"], max: 10 }),
    organisationLinks: rowsOf(linkRow(k, locale), { max: 20 }),
  });

  const parsed = parseForm(schema, formDataToObject(formData));
  if (!parsed.ok) return { ok: false as const, errors: parsed.errors satisfies FieldErrors };
  return { ok: true as const, data: parsed.data };
}
