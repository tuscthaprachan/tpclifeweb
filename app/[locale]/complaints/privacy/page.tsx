/**
 * The privacy notice for the complaints service. Linked from the start page,
 * check your answers and the confirmation. Plain language: what is collected
 * and why, who sees it (including the staff-only restricted categories), what
 * anonymous means, the two essential cookies, how long it is kept and how to
 * ask for access or deletion.
 *
 * The prose is page-specific, so it lives here as bilingual constants, as on
 * the lost and found notice, rather than in the shared string contract.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Stack, SummaryList } from "@/components/ui";
import { REOPEN_WINDOW_DAYS } from "@/lib/complaints/constants";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { fillText } from "@/lib/i18n/editable";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { COMPLAINTS_PRIVACY_TEXT } from "./text";

const TITLE = COMPLAINTS_PRIVACY_TEXT.title;
const INTRO = COMPLAINTS_PRIVACY_TEXT.intro;

const WHAT_HEADING = COMPLAINTS_PRIVACY_TEXT.whatHeading;
const WHAT = [
  {
    what: COMPLAINTS_PRIVACY_TEXT.what1What,
    why: COMPLAINTS_PRIVACY_TEXT.what1Why,
  },
  {
    what: COMPLAINTS_PRIVACY_TEXT.what2What,
    why: COMPLAINTS_PRIVACY_TEXT.what2Why,
  },
  {
    what: COMPLAINTS_PRIVACY_TEXT.what3What,
    why: COMPLAINTS_PRIVACY_TEXT.what3Why,
  },
  {
    what: COMPLAINTS_PRIVACY_TEXT.what4What,
    why: COMPLAINTS_PRIVACY_TEXT.what4Why,
  },
  {
    what: COMPLAINTS_PRIVACY_TEXT.what5What,
    why: COMPLAINTS_PRIVACY_TEXT.what5Why,
  },
  {
    what: COMPLAINTS_PRIVACY_TEXT.what6What,
    why: COMPLAINTS_PRIVACY_TEXT.what6Why,
  },
];

const WHO_HEADING = COMPLAINTS_PRIVACY_TEXT.whoHeading;
const WHO = [
  COMPLAINTS_PRIVACY_TEXT.who1,
  COMPLAINTS_PRIVACY_TEXT.who2,
  COMPLAINTS_PRIVACY_TEXT.who3,
  COMPLAINTS_PRIVACY_TEXT.who4,
  COMPLAINTS_PRIVACY_TEXT.who5,
];

const ANON_HEADING = COMPLAINTS_PRIVACY_TEXT.anonHeading;
const ANON = COMPLAINTS_PRIVACY_TEXT.anon;

const COOKIES_HEADING = COMPLAINTS_PRIVACY_TEXT.cookiesHeading;
const COOKIES = [
  {
    name: "cp_journey",
    purpose: COMPLAINTS_PRIVACY_TEXT.cookies1Purpose,
    duration: COMPLAINTS_PRIVACY_TEXT.cookies1Duration,
  },
  {
    name: "cp_track",
    purpose: COMPLAINTS_PRIVACY_TEXT.cookies2Purpose,
    duration: COMPLAINTS_PRIVACY_TEXT.cookies2Duration,
  },
];
const COOKIES_NOTE = COMPLAINTS_PRIVACY_TEXT.cookiesNote;

const KEEP_HEADING = COMPLAINTS_PRIVACY_TEXT.keepHeading;
const KEEP = [
  COMPLAINTS_PRIVACY_TEXT.keep1,
  COMPLAINTS_PRIVACY_TEXT.keep2,
  COMPLAINTS_PRIVACY_TEXT.keep3,
  COMPLAINTS_PRIVACY_TEXT.keep4,
];

const RIGHTS_HEADING = COMPLAINTS_PRIVACY_TEXT.rightsHeading;
const RIGHTS = COMPLAINTS_PRIVACY_TEXT.rights;

const CONTACT_HEADING = COMPLAINTS_PRIVACY_TEXT.contactHeading;
const CONTACT = COMPLAINTS_PRIVACY_TEXT.contact;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/complaints/privacy"),
    title: TITLE[locale],
    description: INTRO[locale],
  };
}

export default async function ComplaintsPrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.cpServiceName[locale], path: "/complaints" },
          { label: TITLE[locale] },
        ]}
      />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{TITLE[locale]}</Heading>
          <p className="m-0 text-ink-900">{INTRO[locale]}</p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{WHAT_HEADING[locale]}</Heading>
          <SummaryList rows={WHAT.map((row) => ({ key: row.what[locale], value: row.why[locale] }))} />
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{WHO_HEADING[locale]}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {WHO.map((line) => (
              <li key={line.en}>{line[locale]}</li>
            ))}
          </ul>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{ANON_HEADING[locale]}</Heading>
          <p className="m-0 text-ink-900">{ANON[locale]}</p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{COOKIES_HEADING[locale]}</Heading>
          <SummaryList rows={COOKIES.map((row) => ({ key: <code className="break-words">{row.name}</code>, value: `${row.purpose[locale]} (${row.duration[locale]})` }))} />
          <p className="m-0 text-ink-900">{COOKIES_NOTE[locale]}</p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{KEEP_HEADING[locale]}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {KEEP.map((line) => (
              <li key={line.en}>{fillText(line[locale], { days: REOPEN_WINDOW_DAYS })}</li>
            ))}
          </ul>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{RIGHTS_HEADING[locale]}</Heading>
          <p className="m-0 text-ink-900">{RIGHTS[locale]}</p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{CONTACT_HEADING[locale]}</Heading>
          <p className="m-0 text-ink-900">{CONTACT[locale]}</p>
          <p className="m-0">
            <Link href={localePath(locale, "/complaints")} className="text-action underline">
              {UI.cpServiceName[locale]}
            </Link>
          </p>
        </Stack>
      </Stack>
    </Container>
  );
}
