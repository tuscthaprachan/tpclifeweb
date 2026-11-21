/**
 * The privacy notice for equipment borrowing. Linked from the start page, the
 * terms, check your answers and the confirmation. Plain language: what is
 * collected and why, who sees it, the two essential cookies, how long it is
 * kept and how to ask for access or deletion. The data is needed to lend the
 * equipment, so the notice says so; it does not ask for consent.
 *
 * The prose is page-specific, so it lives here as bilingual constants, as on
 * the complaints and lost and found notices, rather than in the shared string
 * contract.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Stack, SummaryList } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { BORROW_PRIVACY_TEXT } from "./text";

const TITLE = BORROW_PRIVACY_TEXT.title;
const INTRO = BORROW_PRIVACY_TEXT.intro;

const WHAT_HEADING = BORROW_PRIVACY_TEXT.whatHeading;
const WHAT = [
  {
    what: BORROW_PRIVACY_TEXT.what1What,
    why: BORROW_PRIVACY_TEXT.what1Why,
  },
  {
    what: BORROW_PRIVACY_TEXT.what2What,
    why: BORROW_PRIVACY_TEXT.what2Why,
  },
  {
    what: BORROW_PRIVACY_TEXT.what3What,
    why: BORROW_PRIVACY_TEXT.what3Why,
  },
  {
    what: BORROW_PRIVACY_TEXT.what4What,
    why: BORROW_PRIVACY_TEXT.what4Why,
  },
  {
    what: BORROW_PRIVACY_TEXT.what5What,
    why: BORROW_PRIVACY_TEXT.what5Why,
  },
];

const BASIS_HEADING = BORROW_PRIVACY_TEXT.basisHeading;
const BASIS = BORROW_PRIVACY_TEXT.basis;

const WHO_HEADING = BORROW_PRIVACY_TEXT.whoHeading;
const WHO = [
  BORROW_PRIVACY_TEXT.who1,
  BORROW_PRIVACY_TEXT.who2,
  BORROW_PRIVACY_TEXT.who3,
  BORROW_PRIVACY_TEXT.who4,
];

const COOKIES_HEADING = BORROW_PRIVACY_TEXT.cookiesHeading;
const COOKIES = [
  {
    name: "br_journey",
    purpose: BORROW_PRIVACY_TEXT.cookies1Purpose,
    duration: BORROW_PRIVACY_TEXT.cookies1Duration,
  },
  {
    name: "br_track",
    purpose: BORROW_PRIVACY_TEXT.cookies2Purpose,
    duration: BORROW_PRIVACY_TEXT.cookies2Duration,
  },
];
const COOKIES_NOTE = BORROW_PRIVACY_TEXT.cookiesNote;

const KEEP_HEADING = BORROW_PRIVACY_TEXT.keepHeading;
const KEEP = [
  BORROW_PRIVACY_TEXT.keep1,
  BORROW_PRIVACY_TEXT.keep2,
  BORROW_PRIVACY_TEXT.keep3,
  BORROW_PRIVACY_TEXT.keep4,
];

const RIGHTS_HEADING = BORROW_PRIVACY_TEXT.rightsHeading;
const RIGHTS = BORROW_PRIVACY_TEXT.rights;

const CONTACT_HEADING = BORROW_PRIVACY_TEXT.contactHeading;
const CONTACT = BORROW_PRIVACY_TEXT.contact;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/borrow/privacy"),
    title: TITLE[locale],
    description: INTRO[locale],
  };
}

export default async function BorrowPrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.brServiceName[locale], path: "/borrow" },
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
          <Heading level={2}>{BASIS_HEADING[locale]}</Heading>
          <p className="m-0 text-ink-900">{BASIS[locale]}</p>
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
          <Heading level={2}>{COOKIES_HEADING[locale]}</Heading>
          <SummaryList rows={COOKIES.map((row) => ({ key: <code className="break-words">{row.name}</code>, value: `${row.purpose[locale]} (${row.duration[locale]})` }))} />
          <p className="m-0 text-ink-900">{COOKIES_NOTE[locale]}</p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{KEEP_HEADING[locale]}</Heading>
          <ul className="m-0 flex list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {KEEP.map((line) => (
              <li key={line.en}>{line[locale]}</li>
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
            <Link href={localePath(locale, "/borrow")} className="text-action underline">
              {UI.brServiceName[locale]}
            </Link>
          </p>
        </Stack>
      </Stack>
    </Container>
  );
}
