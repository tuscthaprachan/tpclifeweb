import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Link, NotificationBanner, Stack, StatusTag } from "@/components/ui";
import { EXTERNAL_SERVICES, FORMS } from "@/data/harvested-inventory";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LocaleString } from "@/lib/content/types";
import { alternatesFor } from "@/lib/i18n/metadata";

/*
 * Positional access into the harvested inventory's `as const` tuples, kept
 * type-exact rather than going through `.find()` (which would collapse the
 * union of differently-shaped entries and lose fields like `destinationUrl`
 * that only some of them have). The runtime checks below exist only to fail
 * loudly if the source file's order ever changes, since this page reads
 * these three records by real URL, not by invented content: CONTRIBUTING.md
 * requires that, and getting the emergency route wrong is the one failure
 * this page exists to prevent.
 */
const emergencyForm = FORMS[0];
if (emergencyForm.key !== "emergencyReport") {
  throw new Error('data/harvested-inventory.ts: FORMS[0] is no longer "emergencyReport". Update app/[locale]/report/page.tsx to match.');
}

const traffyFondue = EXTERNAL_SERVICES[1];
if (traffyFondue.key !== "traffyFondue") {
  throw new Error('data/harvested-inventory.ts: EXTERNAL_SERVICES[1] is no longer "traffyFondue". Update app/[locale]/report/page.tsx to match.');
}

const wellbeingCenter = EXTERNAL_SERVICES[2];
if (wellbeingCenter.key !== "wellbeingCenter") {
  throw new Error('data/harvested-inventory.ts: EXTERNAL_SERVICES[2] is no longer "wellbeingCenter". Update app/[locale]/report/page.tsx to match.');
}

const tuWellBeing = EXTERNAL_SERVICES[3];
if (tuWellBeing.key !== "tuWellBeing") {
  throw new Error('data/harvested-inventory.ts: EXTERNAL_SERVICES[3] is no longer "tuWellBeing". Update app/[locale]/report/page.tsx to match.');
}

// None of these have a home in lib/i18n/strings.ts, which only has generic,
// reusable vocabulary. Hardcoded and reported rather than stretched from
// something that means something adjacent but different.
const PAGE_INTRO: LocaleString = {
  th: "เลือกช่องทางที่ตรงกับเรื่องที่ต้องการแจ้ง มีสามช่องทางแยกกันตามประเภทของเรื่อง",
  en: "Pick the route that matches what you need to report. There are three, sorted by what kind of problem it is",
}; // TODO: add to UI strings
const ROUTE_1_USE_WHEN: LocaleString = {
  th: "ใช้ช่องทางนี้เมื่อเกิดเหตุฉุกเฉิน หรือมีเรื่องร้องเรียนเกี่ยวกับเหตุการณ์ในพื้นที่ธรรมศาสตร์ท่าพระจันทร์",
  en: "Use this for an emergency, or a complaint about something that happened at Thammasat Tha Prachan",
}; // TODO: add to UI strings
const ROUTE_2_USE_WHEN: LocaleString = {
  th: "ใช้ช่องทางนี้เมื่อพบปัญหาสภาพแวดล้อมหรือสิ่งอำนวยความสะดวกในมหาวิทยาลัย เช่น ไฟดับ น้ำรั่ว หรือทางเดินชำรุด",
  en: "Use this for a fault with campus facilities or the physical environment, such as broken lighting, a leak, or a damaged walkway",
}; // TODO: add to UI strings
const ROUTE_3_HEADING: LocaleString = { th: "ความเป็นอยู่และสุขภาพใจของคุณ", en: "Your own wellbeing" }; // TODO: add to UI strings
const ROUTE_3_USE_WHEN: LocaleString = {
  th: "ใช้ช่องทางนี้เมื่อมีเรื่องส่วนตัว ความเครียด หรือปัญหาสุขภาพจิตที่ส่งผลกับตัวคุณเอง",
  en: "Use this for a personal difficulty, stress, or a mental health concern that affects you specifically",
}; // TODO: add to UI strings

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/report"), title: UI.report[locale] };
}

export default async function ReportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.report[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={2}>
          <Heading level={1}>{UI.report[locale]}</Heading>
          <p className="m-0 text-ink-600">{PAGE_INTRO[locale]}</p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{pick(emergencyForm.title, locale)}</Heading>
          <p className="m-0 text-ink-600">{ROUTE_1_USE_WHEN[locale]}</p>
          <NotificationBanner variant="warning" title={UI.requiresSignIn[locale]}>
            {UI.requiresGoogleSignIn[locale]}
          </NotificationBanner>
          <p className="m-0">
            <Link href={emergencyForm.destinationUrl} locale={locale} className="font-semibold text-action">
              {UI.startForm[locale]}
            </Link>
          </p>
          <p className="m-0 text-ink-600">
            {UI.cpFromReport[locale]}{" "}
            <Link href="/complaints" locale={locale} className="font-semibold text-action">
              {UI.cpServiceName[locale]}
            </Link>
          </p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{pick(traffyFondue.name, locale)}</Heading>
          <p className="m-0 text-ink-600">{ROUTE_2_USE_WHEN[locale]}</p>
          {traffyFondue.note ? <p className="m-0 text-ink-600">{pick(traffyFondue.note, locale)}</p> : null}
          <StatusTag tone="neutral" label={UI.noSignInNeeded[locale]} />
          <p className="m-0">
            <Link href={traffyFondue.url} locale={locale} className="font-semibold text-action">
              {UI.startForm[locale]}
            </Link>
          </p>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{ROUTE_3_HEADING[locale]}</Heading>
          <p className="m-0 text-ink-600">{ROUTE_3_USE_WHEN[locale]}</p>
          <StatusTag tone="neutral" label={UI.noSignInNeeded[locale]} />
          <ul className="m-0 flex flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>
              <Link href={wellbeingCenter.url} locale={locale} className="font-semibold text-action">
                {pick(wellbeingCenter.name, locale)}
              </Link>
              {wellbeingCenter.note ? <span className="ml-[var(--space-2)] text-sm text-ink-600">{pick(wellbeingCenter.note, locale)}</span> : null}
            </li>
            <li>
              <Link href={tuWellBeing.url} locale={locale} className="font-semibold text-action">
                {pick(tuWellBeing.name, locale)}
              </Link>
              {tuWellBeing.note ? <span className="ml-[var(--space-2)] text-sm text-ink-600">{pick(tuWellBeing.note, locale)}</span> : null}
            </li>
          </ul>
        </Stack>
      </Stack>
    </Container>
  );
}
