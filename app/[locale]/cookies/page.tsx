/**
 * The cookies page. States plainly what is stored and why, and nothing more.
 *
 * There is no consent banner here on purpose. Every cookie this site sets is
 * strictly necessary (it stores your language choice so the toggle in
 * lib/i18n/config.ts can keep you on the page you were reading), and Vercel
 * Web Analytics, the only other thing that can run, does not use cookies at
 * all. A consent banner over a cookie that is exempt from consent under
 * strictly-necessary rules would be theatre, not information, so this page
 * says what is true instead of asking for a click nobody needs to make.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getSiteSettings } from "@/components/layout/site-settings";
import { Container, DataTable, Heading, Prose, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale, type LocaleString } from "@/lib/i18n/config";
import { THEME_COOKIE } from "@/lib/theme/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";

// TODO: add to UI strings. Page-specific prose with no shared vocabulary
// equivalent beyond the nav label (UI.cookies). Hardcoded per
// CONTRIBUTING.md's own instruction for a missing shared string, reported in
// the harden agent's final report.
const intro = (name: LocaleString): LocaleString => ({
  th: `หน้านี้บอกว่า ${name.th} เก็บข้อมูลอะไรไว้ในเบราว์เซอร์ของคุณ และเก็บไปเพื่ออะไร เว็บไซต์นี้ไม่มีคุกกี้โฆษณาและไม่ติดตามคุณข้ามเว็บไซต์อื่น`,
  en: `This page lists what ${name.en} stores in your browser, and why. There are no advertising cookies and no cross-site tracking.`,
});

const WHAT_HEADING: LocaleString = { th: "สิ่งที่จัดเก็บ", en: "What is stored" };

const TABLE_HEADERS = {
  name: { th: "ชื่อ", en: "Name" },
  purpose: { th: "วัตถุประสงค์", en: "Purpose" },
  duration: { th: "ระยะเวลาเก็บ", en: "Duration" },
} satisfies Record<string, LocaleString>;

const LOCALE_COOKIE_ROW = {
  purpose: {
    th: "จำว่าคุณเลือกอ่านเป็นภาษาไทยหรือภาษาอังกฤษ เพื่อให้เปิดเว็บไซต์ในภาษานั้นทุกครั้งที่กลับมา",
    en: "Remembers whether you chose Thai or English, so the language toggle keeps you on the same page in your chosen language and you are not asked again on your next visit.",
  } satisfies LocaleString,
  duration: { th: "1 ปี", en: "1 year" } satisfies LocaleString,
};

const THEME_COOKIE_ROW = {
  purpose: {
    th: "จำว่าคุณเลือกธีมสว่างหรือมืด ถ้าเลือก “ตามระบบ” จะไม่มีคุกกี้นี้",
    en: "Remembers whether you chose the light or dark theme. If you choose System, this cookie is not set.",
  } satisfies LocaleString,
  duration: { th: "1 ปี", en: "1 year" } satisfies LocaleString,
};

const LF_JOURNEY_ROW = {
  purpose: {
    th: "จำว่าคุณกำลังกรอกเรื่องใดอยู่ในบริการแจ้งของหาย ร้องเรียน หรือยืมอุปกรณ์ เพื่อให้กรอกต่อทีละหน้าได้ คุกกี้เก็บเพียงรหัสสุ่ม ส่วนคำตอบเก็บไว้ที่เซิร์ฟเวอร์ในรูปแบบเข้ารหัส",
    en: "Remembers the lost and found, complaint or borrowing form you are filling in, so you can move between its pages. It holds only a random code. Your answers are kept encrypted on our server.",
  } satisfies LocaleString,
  duration: { th: "2 ชั่วโมง", en: "2 hours" } satisfies LocaleString,
};

const LF_TRACK_ROW = {
  purpose: {
    th: "จำลิงก์ติดตามส่วนตัวของคุณหลังเปิดลิงก์ เพื่อให้ดูสถานะเรื่องได้โดยไม่ต้องให้ลิงก์ค้างอยู่ในแถบที่อยู่",
    en: "Remembers your private tracking link after you open it, so you can see the progress of your case without the link staying in the address bar.",
  } satisfies LocaleString,
  duration: { th: "1 ชั่วโมง", en: "1 hour" } satisfies LocaleString,
};

const NECESSARY_HEADING: LocaleString = { th: "เหตุใดจึงไม่มีแบนเนอร์ขอความยินยอม", en: "Why there is no consent banner" };
const NECESSARY_BODY: LocaleString = {
  th: "คุกกี้ทั้งหมดข้างต้นจำเป็นต่อการทำงานพื้นฐานของเว็บไซต์ กฎหมายคุ้มครองข้อมูลส่วนบุคคลไม่ได้กำหนดให้ขอความยินยอมสำหรับคุกกี้ประเภทนี้ เว็บไซต์จึงไม่แสดงแบนเนอร์ขอความยินยอม",
  en: "The cookies above are strictly necessary for the site's basic operation. Data protection law does not require consent for this category of cookie, so this site does not show a cookie consent banner.",
};

const ANALYTICS_HEADING: LocaleString = { th: "การวิเคราะห์การใช้งาน", en: "Analytics" };
const ANALYTICS_BODY: LocaleString = {
  th: "เมื่อเปิดใช้งาน เว็บไซต์นี้ใช้ Vercel Web Analytics นับจำนวนผู้เข้าชมหน้าเว็บแบบภาพรวมเท่านั้น บริการนี้ไม่ใช้คุกกี้ ไม่เก็บที่อยู่ IP แบบเต็ม ไม่สร้างรหัสที่ใช้ติดตามคุณข้ามการเข้าชมหรือข้ามเว็บไซต์ และไม่นำข้อมูลไปใช้โฆษณา",
  en: "Where enabled, this site uses Vercel Web Analytics to count page views in aggregate only. It does not use cookies, does not store your full IP address, does not create an identifier that tracks you across visits or across other sites, and is never used for advertising.",
};

const NO_ADS_HEADING: LocaleString = { th: "คุกกี้และการติดตามที่ไม่ใช้", en: "Cookies and tracking not used" };
const NO_ADS_BODY: LocaleString = {
  th: "เว็บไซต์นี้ไม่มีคุกกี้โฆษณา ไม่มีคุกกี้ติดตามเพื่อการตลาดจากบุคคลที่สาม และไม่ขายหรือแบ่งปันข้อมูลการใช้งานของคุณให้ใคร",
  en: "No advertising cookies, no third-party marketing trackers, and your usage data is never sold or shared with anyone outside this service.",
};

const CONTROL_HEADING: LocaleString = { th: "วิธีลบคุกกี้", en: "Deleting cookies" };
const CONTROL_BODY: LocaleString = {
  th: "คุณลบคุกกี้เหล่านี้ได้ทุกเมื่อในการตั้งค่าเบราว์เซอร์ การลบไม่กระทบส่วนอื่นของเว็บไซต์ ครั้งถัดไปเว็บไซต์จะเลือกภาษาให้ตามภาษาของเบราว์เซอร์ และใช้ธีมตามระบบ",
  en: "You can delete these cookies at any time in your browser settings. Nothing else on the site is affected. On your next visit the site picks a language from your browser's language setting and follows your system theme.",
};

const EAT_STORAGE_HEADING: LocaleString = { th: "ข้อมูลที่เก็บไว้ในเครื่องจาก \"กินอะไรดี\"", en: "Data kept on your device by What to eat" };
const EAT_STORAGE_BODY: LocaleString = {
  th: "ส่วน \"กินอะไรดี\" เก็บข้อมูลส่วนตัวไว้ในที่เก็บข้อมูลของเบราว์เซอร์ (localStorage) เท่านั้น โดยใช้ชื่อที่ขึ้นต้นด้วย trytpc.eat.v1. ได้แก่ เมนูโปรด เมนูที่ไม่เอา ประวัติที่คุณกด \"กินมื้อนี้\" พร้อมราคา ณ ตอนที่กด ตัวกรองที่ตั้งไว้ และแผนสัปดาห์ที่บันทึกไว้ ข้อมูลเหล่านี้ไม่ถูกส่งไปที่ใดและไม่มีบัญชีผู้ใช้ คุณลบได้ทุกเมื่อด้วยปุ่ม \"ล้างทุกอย่าง\" ในหน้า \"ของฉัน\" (/eat/mine) หรือล้างข้อมูลเว็บไซต์ในเบราว์เซอร์",
  en: "The What to eat section keeps personal data only in your browser's own storage (localStorage), under names that start with trytpc.eat.v1. That is your favourites, dishes you never want suggested, what you tapped \"I'll eat this\" for with the price at that moment, your saved filters and a saved week plan. None of it is sent anywhere and there is no account. Clear it any time with the \"Clear everything\" button on Your stuff (/eat/mine), or by clearing this site's data in your browser.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/cookies"),
    title: UI.cookies[locale],
    description: intro((await getSiteSettings()).serviceName)[locale],
  };
}

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.cookies[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={4}>
          <Heading level={1}>{UI.cookies[locale]}</Heading>
          <Prose locale={locale}>
            <p>{intro((await getSiteSettings()).serviceName)[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{WHAT_HEADING[locale]}</Heading>
          <DataTable
            caption={WHAT_HEADING[locale]}
            columns={[
              { id: "name", header: TABLE_HEADERS.name[locale], cell: (row) => row.name },
              { id: "purpose", header: TABLE_HEADERS.purpose[locale], cell: (row) => row.purpose },
              { id: "duration", header: TABLE_HEADERS.duration[locale], cell: (row) => row.duration },
            ]}
            rows={[
              {
                name: LOCALE_COOKIE,
                purpose: LOCALE_COOKIE_ROW.purpose[locale],
                duration: LOCALE_COOKIE_ROW.duration[locale],
              },
              { name: THEME_COOKIE, purpose: THEME_COOKIE_ROW.purpose[locale], duration: THEME_COOKIE_ROW.duration[locale] },
              { name: "lf_journey_…, cp_journey, br_journey", purpose: LF_JOURNEY_ROW.purpose[locale], duration: LF_JOURNEY_ROW.duration[locale] },
              { name: "lf_track, cp_track, br_track", purpose: LF_TRACK_ROW.purpose[locale], duration: LF_TRACK_ROW.duration[locale] },
            ]}
            getRowKey={(row) => row.name}
          />
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{NECESSARY_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{NECESSARY_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{ANALYTICS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{ANALYTICS_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{NO_ADS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{NO_ADS_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{CONTROL_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{CONTROL_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{EAT_STORAGE_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{EAT_STORAGE_BODY[locale]}</p>
          </Prose>
        </Stack>
      </Stack>
    </Container>
  );
}
