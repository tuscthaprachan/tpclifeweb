/**
 * The single form page: the GOV.UK "check a service is suitable" pattern.
 * Who can use it, what to bring, the sign-in requirement stated before the
 * click (never a footnote), how long it takes, and only then the button.
 *
 * The verified example this page exists for: the TPC emergency report form
 * (data/harvested-inventory.ts) returns HTTP 401 to an anonymous request.
 * `requiresSignIn` is exactly how a student learns that before they click,
 * not after.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { FormRequirements, NO_SIGN_IN_ON_FORM, OWNER_LABEL_KEY, SIGN_IN_ON_FORM } from "@/components/domain/form";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { NotificationBanner } from "@/components/ui/NotificationBanner";
import { Stack } from "@/components/ui/Stack";
import { StatusTag } from "@/components/ui/StatusTag";
import { SummaryList, type SummaryListRow } from "@/components/ui/SummaryList";
import { Timestamp } from "@/components/ui/Timestamp";
import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { formatDuration } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { getFormBySlug, getForms } from "@/lib/content";
import type { FormRecord, HelpContact } from "@/lib/content/types";

/*
 * Copy that lib/i18n/strings.ts does not carry. UI.requiresGoogleSignIn
 * covers the Google case exactly; there is no equivalent for a TU account or
 * an unspecified "other" account, and no shared wording for a form that is
 * submitted by email, by LINE, or in person rather than by following a link.
 * Hardcoded per house style (official register, both languages, no em dash)
 * rather than invented into the shared file, and reported as a gap.
 */
// TODO: add to UI strings.
const SIGN_IN_ACCOUNT_NOTE: Record<"google" | "tuAccount" | "other", LocaleString> = {
  google: {
    th: "การเข้าสู่ระบบทำในแบบฟอร์มภายนอก ไม่ใช่บนเว็บไซต์นี้ ใช้บัญชี Google ของมหาวิทยาลัยธรรมศาสตร์ (บัญชี TU) ก่อนกรอก",
    en: "Signing in happens on the external form, not on this website. Use your Thammasat (TU) Google account before filling it in",
  },
  tuAccount: {
    th: "การเข้าสู่ระบบทำในแบบฟอร์มภายนอก ไม่ใช่บนเว็บไซต์นี้ ใช้บัญชีมหาวิทยาลัยธรรมศาสตร์ (บัญชี TU) ก่อนกรอก",
    en: "Signing in happens on the external form, not on this website. Use your Thammasat (TU) account before filling it in",
  },
  other: {
    th: "การเข้าสู่ระบบทำในแบบฟอร์มภายนอก ไม่ใช่บนเว็บไซต์นี้ โปรดตรวจสอบบัญชีที่ต้องใช้กับผู้รับผิดชอบด้านล่าง",
    en: "Signing in happens on the external form, not on this website. Check which account you need with the contact below",
  },
};
// TODO: add to UI strings.
const EMAIL_START_LABEL: LocaleString = { th: "ส่งอีเมลเพื่อดำเนินการ", en: "Email to proceed" };
// TODO: add to UI strings.
const LINE_START_LABEL: LocaleString = { th: "เปิดแชท LINE เพื่อดำเนินการ", en: "Open LINE chat to proceed" };
// TODO: add to UI strings.
const IN_PERSON_NOTE: LocaleString = {
  th: "แบบฟอร์มนี้ดำเนินการด้วยตนเองที่หน่วยงาน ไม่มีลิงก์สำหรับกรอกออนไลน์",
  en: "This form is handled in person at the office. There is no online link to fill in",
};
// TODO: add to UI strings.
const NO_DESTINATION_NOTE: LocaleString = {
  th: "ยังไม่มีลิงก์ที่บันทึกไว้สำหรับแบบฟอร์มนี้ โปรดติดต่อผู้รับผิดชอบด้านล่าง",
  en: "No link has been recorded for this form yet. Contact the responsible body below",
};

export async function generateStaticParams() {
  const forms = await getForms();
  return LOCALES.flatMap((locale) => forms.map((form) => ({ locale, slug: form.slug.current })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const form = await getFormBySlug(slug);

  if (!form) {
    return { title: UI.pageNotFoundTitle[locale] };
  }

  const title = pick(form.title, locale);
  const description = pick(form.purpose, locale);

  return {
    title,
    description,
    alternates: {
      canonical: localePath(locale, `/forms/${slug}`),
      languages: {
        th: localePath("th", `/forms/${slug}`),
        en: localePath("en", `/forms/${slug}`),
        "x-default": localePath(DEFAULT_LOCALE, `/forms/${slug}`),
      },
    },
  };
}

/** Mirrors HelpBlock's own channel-to-href mapping (components/layout/HelpBlock.tsx). Kept local rather than imported: that component owns the site-wide "Need help" section built from SiteSettings.helpContacts, a different thing from one form's own `contact`. */
function contactHref(contact: HelpContact): string | null {
  switch (contact.channel) {
    case "email":
      return `mailto:${contact.value}`;
    case "phone":
      return `tel:${contact.value.replace(/[\s-]/g, "")}`;
    case "line":
    case "url":
      return contact.value;
    case "inPerson":
      return null;
  }
}

/**
 * Step 6 of the page: the start button, or the honest substitute for one.
 * `destinationType` values that are not "click a link" (email, inPerson,
 * line) never render a dead button.
 */
function StartAction({ form, locale }: { form: FormRecord; locale: Locale }): ReactNode {
  const { destinationType, destinationUrl } = form;

  if (destinationType === "inPerson") {
    return (
      <NotificationBanner variant="info" title={UI.whatHappensNext[locale]}>
        {pick(IN_PERSON_NOTE, locale)}
      </NotificationBanner>
    );
  }

  if (!destinationUrl) {
    return (
      <NotificationBanner variant="info" title={UI.whatHappensNext[locale]}>
        {pick(NO_DESTINATION_NOTE, locale)}
      </NotificationBanner>
    );
  }

  if (destinationType === "email") {
    const href = destinationUrl.startsWith("mailto:") ? destinationUrl : `mailto:${destinationUrl}`;
    return <Button href={href}>{pick(EMAIL_START_LABEL, locale)}</Button>;
  }

  const external = isExternalUrl(destinationUrl);
  const suffix = externalLinkSuffix(locale, external);
  const label = destinationType === "line" ? pick(LINE_START_LABEL, locale) : UI.startForm[locale];

  return (
    <Button href={destinationUrl} {...externalLinkProps(external)}>
      {label}
      {suffix ? <span className="visually-hidden">{suffix}</span> : null}
    </Button>
  );
}

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const form = await getFormBySlug(slug);
  if (!form) notFound();

  const title = pick(form.title, locale);
  const purpose = pick(form.purpose, locale);
  const audience = form.audience ? pick(form.audience, locale) : null;
  const prerequisites = form.prerequisites ?? [];
  const signInType = form.signInType;

  const metaRows: SummaryListRow[] = [];
  if (form.estimatedMinutes !== undefined) {
    metaRows.push({ key: UI.takesAbout[locale], value: formatDuration(form.estimatedMinutes, locale) });
  }
  if (form.deadline) {
    metaRows.push({ key: UI.deadline[locale], value: <Timestamp value={form.deadline} locale={locale} /> });
  }
  if (form.turnaround) {
    metaRows.push({ key: UI.whatHappensNext[locale], value: pick(form.turnaround, locale) });
  }
  metaRows.push({ key: UI.formOwner[locale], value: UI[OWNER_LABEL_KEY[form.owner]][locale] });

  const contact = form.contact;
  const contactUrl = contact ? contactHref(contact) : null;
  const contactExternal = contactUrl ? isExternalUrl(contactUrl) : false;

  return (
    <ShellContainer className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.forms[locale], path: "/forms" },
          { label: title },
        ]}
      />

      <Stack space={8} className="max-w-[var(--width-narrow)]">
        <Stack space={2}>
          <Heading level={1}>{title}</Heading>
          <p className="m-0 text-base text-ink-600">{purpose}</p>
        </Stack>

        {audience ? (
          <Stack space={2}>
            <Heading level={2}>{UI.whoCanUse[locale]}</Heading>
            <p className="m-0 text-ink-900">{audience}</p>
          </Stack>
        ) : null}

        {prerequisites.length > 0 ? (
          <Stack space={2}>
            <Heading level={2}>{UI.whatYouNeed[locale]}</Heading>
            <FormRequirements prerequisites={prerequisites} locale={locale} />
          </Stack>
        ) : null}

        <Stack space={2}>
          <Heading level={2}>{UI.beforeYouStart[locale]}</Heading>
          {form.requiresSignIn ? (
            <NotificationBanner variant="warning" title={SIGN_IN_ON_FORM[locale]}>
              {pick(SIGN_IN_ACCOUNT_NOTE[signInType ?? "other"], locale)}
              {form.signInNote ? ` ${pick(form.signInNote, locale)}` : null}
            </NotificationBanner>
          ) : (
            <StatusTag tone="success" label={NO_SIGN_IN_ON_FORM[locale]} />
          )}
        </Stack>

        <SummaryList rows={metaRows} />

        <StartAction form={form} locale={locale} />

        {contact ? (
          <Stack space={2}>
            <Heading level={2}>{UI.needHelp[locale]}</Heading>
            <p className="m-0">
              {contactUrl ? (
                <a href={contactUrl} {...externalLinkProps(contactExternal)} className="text-action underline">
                  {pick(contact.label, locale)}
                  {contactExternal ? <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span> : null}
                </a>
              ) : (
                <span>{pick(contact.label, locale)}</span>
              )}
              {contact.hours ? <span className="text-ink-600"> · {pick(contact.hours, locale)}</span> : null}
            </p>
          </Stack>
        ) : null}
      </Stack>
    </ShellContainer>
  );
}
