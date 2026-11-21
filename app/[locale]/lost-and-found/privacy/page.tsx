/**
 * The privacy notice for the lost and found service. Linked from every start
 * page and from check your answers. Plain language: what is collected and
 * why, who sees it, the two essential cookies, how long it is kept (deleted
 * one year after the case closes) and how to ask for access or deletion.
 *
 * The prose is page-specific, so it lives here as bilingual constants, as on
 * the cookies page, rather than in the shared string contract.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Stack, SummaryList } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { LOST_FOUND_PRIVACY_TEXT } from "./text";

const TITLE = LOST_FOUND_PRIVACY_TEXT.title;
const INTRO = LOST_FOUND_PRIVACY_TEXT.intro;

const WHAT_HEADING = LOST_FOUND_PRIVACY_TEXT.whatHeading;
const WHAT = [
  {
    what: LOST_FOUND_PRIVACY_TEXT.what1What,
    why: LOST_FOUND_PRIVACY_TEXT.what1Why,
  },
  {
    what: LOST_FOUND_PRIVACY_TEXT.what2What,
    why: LOST_FOUND_PRIVACY_TEXT.what2Why,
  },
  {
    what: LOST_FOUND_PRIVACY_TEXT.what3What,
    why: LOST_FOUND_PRIVACY_TEXT.what3Why,
  },
  {
    what: LOST_FOUND_PRIVACY_TEXT.what4What,
    why: LOST_FOUND_PRIVACY_TEXT.what4Why,
  },
  {
    what: LOST_FOUND_PRIVACY_TEXT.what5What,
    why: LOST_FOUND_PRIVACY_TEXT.what5Why,
  },
];

const WHO_HEADING = LOST_FOUND_PRIVACY_TEXT.whoHeading;
const WHO = [
  LOST_FOUND_PRIVACY_TEXT.who1,
  LOST_FOUND_PRIVACY_TEXT.who2,
  LOST_FOUND_PRIVACY_TEXT.who3,
  LOST_FOUND_PRIVACY_TEXT.who4,
];

const COOKIES_HEADING = LOST_FOUND_PRIVACY_TEXT.cookiesHeading;
const COOKIES = [
  {
    name: "lf_journey_lost, lf_journey_found, lf_journey_claim",
    purpose: LOST_FOUND_PRIVACY_TEXT.cookies1Purpose,
    duration: LOST_FOUND_PRIVACY_TEXT.cookies1Duration,
  },
  {
    name: "lf_track",
    purpose: LOST_FOUND_PRIVACY_TEXT.cookies2Purpose,
    duration: LOST_FOUND_PRIVACY_TEXT.cookies2Duration,
  },
];
const COOKIES_NOTE = LOST_FOUND_PRIVACY_TEXT.cookiesNote;

const KEEP_HEADING = LOST_FOUND_PRIVACY_TEXT.keepHeading;
const KEEP = [
  LOST_FOUND_PRIVACY_TEXT.keep1,
  LOST_FOUND_PRIVACY_TEXT.keep2,
  LOST_FOUND_PRIVACY_TEXT.keep3,
  LOST_FOUND_PRIVACY_TEXT.keep4,
];

const RIGHTS_HEADING = LOST_FOUND_PRIVACY_TEXT.rightsHeading;
const RIGHTS = LOST_FOUND_PRIVACY_TEXT.rights;

const CONTACT_HEADING = LOST_FOUND_PRIVACY_TEXT.contactHeading;
const CONTACT = LOST_FOUND_PRIVACY_TEXT.contact;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/lost-and-found/privacy"),
    title: TITLE[locale],
    description: INTRO[locale],
  };
}

export default async function LostFoundPrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.lostAndFound[locale], path: "/lost-and-found" },
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
            <Link href={localePath(locale, "/lost-and-found")} className="text-action underline">
              {UI.lostAndFound[locale]}
            </Link>
          </p>
        </Stack>
      </Stack>
    </Container>
  );
}
