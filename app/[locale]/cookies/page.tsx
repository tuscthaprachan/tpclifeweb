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
import { Container, DataTable, Heading, Prose, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";

// TODO: add to UI strings. Page-specific prose with no shared vocabulary
// equivalent beyond the nav label (UI.cookies). Hardcoded per
// CONTRIBUTING.md's own instruction for a missing shared string, reported in
// the harden agent's final report.
const INTRO: LocaleString = {
  th: "หน้านี้อธิบายตรงไปตรงมาว่าเว็บไซต์ #ท้ายท่าพระจันทร์ เก็บอะไรไว้ในเบราว์เซอร์ของคุณบ้าง และเก็บไว้เพื่ออะไร ไม่มีคุกกี้โฆษณา และไม่มีการติดตามข้ามเว็บไซต์",
  en: "This page states plainly what #trytpc stores in your browser, and why. There are no advertising cookies and no cross-site tracking.",
};

const WHAT_HEADING: LocaleString = { th: "สิ่งที่จัดเก็บ", en: "What is stored" };

const TABLE_HEADERS = {
  name: { th: "ชื่อ", en: "Name" },
  purpose: { th: "วัตถุประสงค์", en: "Purpose" },
  duration: { th: "ระยะเวลาเก็บ", en: "Duration" },
} satisfies Record<string, LocaleString>;

const LOCALE_COOKIE_ROW = {
  purpose: {
    th: "จดจำว่าคุณเลือกอ่านเป็นภาษาไทยหรือภาษาอังกฤษ เพื่อให้ปุ่มเปลี่ยนภาษาพาคุณไปหน้าเดียวกันในภาษาที่เลือกไว้ และเพื่อไม่ต้องถามซ้ำทุกครั้งที่กลับมาเยี่ยมชม",
    en: "Remembers whether you chose Thai or English, so the language toggle keeps you on the same page in your chosen language and you are not asked again on your next visit.",
  } satisfies LocaleString,
  duration: { th: "1 ปี", en: "1 year" } satisfies LocaleString,
};

const LF_JOURNEY_ROW = {
  purpose: {
    th: "จดจำแบบฟอร์มแจ้งของหายหรือของที่พบ หรือแบบฟอร์มขอรับของ ที่คุณกำลังกรอกอยู่ เพื่อให้กรอกต่อทีละหน้าได้ คุกกี้เก็บเพียงรหัสสุ่ม คำตอบของคุณถูกเข้ารหัสไว้ที่เซิร์ฟเวอร์",
    en: "Remembers the lost, found or claim form you are filling in, so you can move between its pages. It holds only a random code; your answers are kept encrypted on our server.",
  } satisfies LocaleString,
  duration: { th: "2 ชั่วโมง", en: "2 hours" } satisfies LocaleString,
};

const LF_TRACK_ROW = {
  purpose: {
    th: "จดจำลิงก์ติดตามส่วนตัวของคุณหลังจากเปิดลิงก์ เพื่อให้ดูสถานะเรื่องได้โดยไม่ต้องแสดงลิงก์ไว้ในแถบที่อยู่",
    en: "Remembers your private tracking link after you open it, so you can see your case without the link showing in the address bar.",
  } satisfies LocaleString,
  duration: { th: "1 ชั่วโมง", en: "1 hour" } satisfies LocaleString,
};

const NECESSARY_HEADING: LocaleString = { th: "เหตุใดจึงไม่มีแบนเนอร์ขอความยินยอม", en: "Why there is no consent banner" };
const NECESSARY_BODY: LocaleString = {
  th: "คุกกี้ทั้งหมดข้างต้นเป็นคุกกี้ที่จำเป็นอย่างยิ่ง (strictly necessary) ต่อการทำงานพื้นฐานของเว็บไซต์ กฎหมายคุ้มครองข้อมูลส่วนบุคคลไม่กำหนดให้ต้องขอความยินยอมสำหรับคุกกี้ประเภทนี้ เว็บไซต์นี้จึงไม่แสดงแบนเนอร์ขอความยินยอมคุกกี้ เพราะเป็นการแสดงผลที่ไม่มีความหมายจริง ไม่ใช่การให้ข้อมูลที่เป็นประโยชน์",
  en: "The cookies above are strictly necessary for the site's basic operation. Data protection law does not require consent for this category of cookie, so this site does not show a cookie consent banner: doing so over an exempt cookie would be theatre, not useful information.",
};

const ANALYTICS_HEADING: LocaleString = { th: "การวิเคราะห์การใช้งาน", en: "Analytics" };
const ANALYTICS_BODY: LocaleString = {
  th: "หากเปิดใช้งาน เว็บไซต์นี้ใช้ Vercel Web Analytics เพื่อนับจำนวนการเข้าชมหน้าเว็บแบบภาพรวมเท่านั้น บริการนี้ไม่ใช้คุกกี้ ไม่เก็บที่อยู่ IP แบบเต็ม ไม่สร้างตัวระบุตัวตนที่ติดตามคุณข้ามการเข้าชมหรือข้ามเว็บไซต์อื่น และไม่นำข้อมูลไปใช้เพื่อการโฆษณา",
  en: "Where enabled, this site uses Vercel Web Analytics to count page views in aggregate only. It does not use cookies, does not store your full IP address, does not create an identifier that tracks you across visits or across other sites, and is never used for advertising.",
};

const NO_ADS_HEADING: LocaleString = { th: "สิ่งที่ไม่มี", en: "What is not here" };
const NO_ADS_BODY: LocaleString = {
  th: "ไม่มีคุกกี้โฆษณา ไม่มีคุกกี้ติดตามจากบุคคลที่สามเพื่อการตลาด และไม่มีการขายหรือแบ่งปันข้อมูลการใช้งานของคุณให้บุคคลภายนอก",
  en: "No advertising cookies, no third-party marketing trackers, and your usage data is never sold or shared with anyone outside this service.",
};

const CONTROL_HEADING: LocaleString = { th: "การควบคุมของคุณ", en: "Your control" };
const CONTROL_BODY: LocaleString = {
  th: "คุณสามารถลบคุกกี้ภาษาได้ทุกเมื่อผ่านการตั้งค่าเบราว์เซอร์ของคุณ การลบคุกกี้นี้จะไม่ทำให้ฟีเจอร์อื่นของเว็บไซต์เสียหาย เว็บไซต์จะเพียงเลือกภาษาให้ใหม่ตามภาษาของเบราว์เซอร์คุณในครั้งถัดไป",
  en: "You can delete the language cookie at any time through your browser settings. Doing so does not break anything else on the site: it will simply choose a language again from your browser's language settings on your next visit.",
};

const EAT_STORAGE_HEADING: LocaleString = { th: "ข้อมูลในเครื่องของคุณ จาก \"กินอะไรดี\"", en: "Data kept on your device by What to eat" };
const EAT_STORAGE_BODY: LocaleString = {
  th: "ส่วน \"กินอะไรดี\" เก็บข้อมูลส่วนตัวไว้ในหน่วยความจำของเบราว์เซอร์ (localStorage) เท่านั้น ใช้ชื่อที่ขึ้นต้นด้วย trytpc.eat.v1. ได้แก่ เมนูโปรด เมนูที่ไม่เอา ประวัติที่คุณกด \"กินมื้อนี้\" พร้อมราคา ณ ตอนกด ตัวกรองที่ตั้งไว้ และแผนสัปดาห์ที่เก็บไว้ ไม่มีการส่งไปที่ไหนและไม่มีบัญชี ลบได้ทุกเมื่อด้วยปุ่ม \"ล้างทุกอย่าง\" ในหน้า ของฉัน (/eat/mine) หรือด้วยการล้างข้อมูลเว็บไซต์ในเบราว์เซอร์",
  en: "The What to eat section keeps personal data only in your browser's own storage (localStorage), under names that start with trytpc.eat.v1. That is your favourites, dishes you never want suggested, what you tapped \"I'll eat this\" for with the price at that moment, your saved filters and a saved week plan. None of it is sent anywhere and there is no account. Clear it any time with the \"Clear everything\" button on Your stuff (/eat/mine), or by clearing this site's data in your browser.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/cookies"),
    title: UI.cookies[locale],
    description: INTRO[locale],
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
            <p>{INTRO[locale]}</p>
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
              { name: "lf_journey_…", purpose: LF_JOURNEY_ROW.purpose[locale], duration: LF_JOURNEY_ROW.duration[locale] },
              { name: "lf_track", purpose: LF_TRACK_ROW.purpose[locale], duration: LF_TRACK_ROW.duration[locale] },
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
