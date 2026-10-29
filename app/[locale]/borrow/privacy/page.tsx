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
import { DEFAULT_LOCALE, isLocale, localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

const s = (th: string, en: string): LocaleString => ({ th, en });

const TITLE = s("ประกาศความเป็นส่วนตัว การยืมอุปกรณ์", "Privacy notice for borrowing equipment");
const INTRO = s(
  "การยืมอุปกรณ์ดำเนินการโดย อมธ. ท่าพระจันทร์ หน้านี้บอกว่าเราเก็บข้อมูลอะไร เพราะเหตุใด ใครเห็นได้ และเก็บนานเท่าใด",
  "Equipment loans are run by TUSU at Tha Prachan. This page says what we collect, why, who can see it and how long we keep it",
);

const WHAT_HEADING = s("ข้อมูลที่เราเก็บและเหตุผล", "What we collect and why");
const WHAT: Array<{ what: LocaleString; why: LocaleString }> = [
  {
    what: s("ชื่อ เบอร์โทรศัพท์ และอีเมล (อีเมลไม่บังคับ)", "Your name, mobile number and email address (email is optional)"),
    why: s(
      "เพื่อติดต่อเรื่องการรับและคืนอุปกรณ์ และแจ้งผลการพิจารณา ข้อมูลเหล่านี้เข้ารหัสไว้ และเจ้าหน้าที่เปิดดูได้ก็ต่อเมื่อเลือกแสดงข้อมูล ซึ่งระบบบันทึกทุกครั้ง",
      "To reach you about collecting and returning the equipment and to tell you the decision. They are encrypted, and staff can read them only by choosing to show them, which is logged every time",
    ),
  },
  {
    what: s("เลขประจำตัวนักศึกษา และคณะ หรือหน่วยงานที่คุณสังกัด", "Your student number and faculty, or the organisation you belong to"),
    why: s(
      "เพื่อยืนยันว่าผู้ยืมเป็นใคร และให้ติดตามอุปกรณ์ที่ไม่ได้คืนได้ เลขประจำตัวและหน่วยงานเข้ารหัสไว้ เราไม่เก็บเลขบัตรนักศึกษาหรือบัตรประชาชนที่ใช้เป็นหลักประกัน",
      "To know who is borrowing, and to follow up equipment that is not returned. The number and organisation are encrypted. We never record the number of the card left as a deposit",
    ),
  },
  {
    what: s("ชื่อกิจกรรม สถานที่ใช้ และวัตถุประสงค์ รวมถึงชื่อกลุ่มหรือชมรมที่ยืมแทน", "The event, where it will be used, what it is for, and the name of the club or group you borrow for"),
    why: s(
      "เพื่อให้เจ้าหน้าที่พิจารณาคำขอ ข้อมูลนี้ไม่ใช่ข้อมูลส่วนบุคคลของคุณโดยตรง จึงไม่ได้เข้ารหัส แต่แสดงเฉพาะเจ้าหน้าที่ ไม่แสดงต่อสาธารณะ",
      "So staff can decide on the request. This is not personal data about you as such, so it is not encrypted, but only staff see it. It is never shown publicly",
    ),
  },
  {
    what: s("รายการอุปกรณ์ จำนวน วันเวลารับและคืน และเวลาที่คุณยอมรับเงื่อนไข", "The items and quantities, the collection and return times, and when you accepted the terms"),
    why: s(
      "เพื่อจองอุปกรณ์ไม่ให้ซ้ำกัน และบันทึกว่าคุณยอมรับเงื่อนไขฉบับใดและเมื่อใด แทนการลงลายมือชื่อในแบบฟอร์มกระดาษ",
      "To reserve the equipment so it is not promised twice, and to record which version of the terms you accepted and when, in place of a signature on a paper form",
    ),
  },
  {
    what: s("ที่อยู่ไอพีและชนิดของเบราว์เซอร์", "Your IP address and browser type"),
    why: s(
      "เพื่อความปลอดภัย จำกัดการใช้งานเกินปกติ และตรวจสอบย้อนหลังว่าใครทำอะไรกับคำขอ เก็บในบันทึกการตรวจสอบ ไม่ใช้ติดตามตัวคุณ",
      "For security, to limit abuse, and to keep a record of who did what on a request. They are kept in the audit log and are not used to track you",
    ),
  },
];

const BASIS_HEADING = s("เหตุผลที่เราใช้ข้อมูล", "Why we may use it");
const BASIS = s(
  "เราต้องใช้ข้อมูลเหล่านี้เพื่อให้ยืมอุปกรณ์แก่คุณ จึงไม่ขอความยินยอมแยกต่างหาก หากคุณไม่ต้องการให้ข้อมูล เราให้ยืมอุปกรณ์ไม่ได้ ส่วนอีเมลเป็นทางเลือก",
  "We need this information to lend you the equipment, so we do not ask for separate consent. Without it we cannot lend. Your email address is the one optional item",
);

const WHO_HEADING = s("ใครเห็นข้อมูลของคุณ", "Who can see your data");
const WHO = [
  s(
    "เจ้าหน้าที่ อมธ. ที่ดูแลการยืมอุปกรณ์เท่านั้น และผู้ดูแลระบบ ทุกครั้งที่มีผู้เปิดดูชื่อ เบอร์โทรศัพท์ เลขประจำตัวนักศึกษา หรือหน่วยงานของคุณ ระบบจะบันทึกไว้",
    "Only the TUSU staff who look after equipment loans, and system administrators. Every time someone opens your name, number, student number or organisation, it is logged",
  ),
  s("หน้าเว็บไซต์สาธารณะไม่แสดงคำขอยืมใดเลย ปฏิทินอุปกรณ์แสดงเพียงจำนวนที่ว่าง ไม่แสดงว่าใครยืม", "The public website never shows a request. The availability calendar shows only how many are free, never who has them"),
  s(
    "ถ้าคุณขอให้ส่งลิงก์ส่วนตัวทางอีเมล หรือเจ้าหน้าที่แจ้งผลหรือเตือนวันคืนทางอีเมล ผู้ให้บริการอีเมลของเราจะได้รับที่อยู่อีเมลของคุณเพื่อการนั้นเท่านั้น",
    "If you ask us to email your private link, or staff email you the decision or a reminder to return, our email provider receives your address for those messages only",
  ),
  s("เราไม่ขายหรือแบ่งปันข้อมูลของคุณให้ผู้อื่นเพื่อการตลาด", "We do not sell your data or share it for marketing"),
];

const COOKIES_HEADING = s("คุกกี้ที่จำเป็น", "Essential cookies");
const COOKIES: Array<{ name: string; purpose: LocaleString; duration: LocaleString }> = [
  {
    name: "br_journey",
    purpose: s(
      "รหัสสุ่มที่ช่วยให้เราจำคำตอบที่คุณกรอกไว้ระหว่างหน้า โดยเก็บคำตอบเข้ารหัสไว้บนเซิร์ฟเวอร์ ไม่มีข้อมูลส่วนบุคคลอยู่ในที่อยู่เว็บหรือในคุกกี้",
      "A random code that lets us keep your answers between pages. The answers stay encrypted on our server. No personal data goes in the web address or the cookie",
    ),
    duration: s("2 ชั่วโมง", "2 hours"),
  },
  {
    name: "br_track",
    purpose: s(
      "จำเลขอ้างอิงและรหัสลิงก์ส่วนตัวของคำขอที่คุณเปิดดู เพื่อไม่ให้รหัสค้างอยู่ในที่อยู่เว็บ",
      "Remembers the reference and private link code of the request you opened, so the code does not stay in the web address",
    ),
    duration: s("1 ชั่วโมง", "1 hour"),
  },
];
const COOKIES_NOTE = s(
  "คุกกี้ทั้งสองจำเป็นต่อการทำงานของบริการ ไม่ใช้ติดตามหรือโฆษณา จึงไม่ต้องขอความยินยอมแยกต่างหาก",
  "Both are needed for the service to work. They are not used for tracking or advertising, so no separate consent is needed",
);

const KEEP_HEADING = s("เก็บนานเท่าใด", "How long we keep it");
const KEEP = [
  s("คำตอบที่ยังไม่ได้ส่ง: ลบเมื่อพ้น 2 ชั่วโมงนับจากการบันทึกครั้งล่าสุด", "Answers you have not sent: deleted 2 hours after the last save"),
  s(
    "หน้ายืนยันที่แสดงลิงก์ส่วนตัว: เก็บไว้ 30 นาทีเท่านั้น แล้วลบ เราแสดงลิงก์นี้อีกไม่ได้",
    "The confirmation page that shows your private link: kept for 30 minutes only, then deleted. We cannot show the link again later",
  ),
  s(
    "ข้อมูลส่วนบุคคลในคำขอ: ลบหลังคำขอปิดครบ 1 ปี คำขอปิดเมื่อคืนอุปกรณ์ครบ ชดใช้แล้ว ไม่อนุมัติ ยกเลิก หรือไม่มารับ",
    "Personal data in a request: deleted one year after it closes. A request closes when everything is returned, put right, declined, cancelled or not collected",
  ),
  s(
    "หลังลบแล้ว เรายังเก็บเพียงรายการอุปกรณ์ จำนวน วันเวลา และสถานะของคำขอ โดยไม่มีข้อมูลส่วนบุคคล",
    "After deletion we keep only the items, quantities, times and status of the request, with no personal data",
  ),
];

const RIGHTS_HEADING = s("สิทธิ์ของคุณ", "Your rights");
const RIGHTS = s(
  "คุณขอดู แก้ไข หรือลบข้อมูลของคุณได้ ติดต่อเจ้าหน้าที่ตามช่องทางท้ายหน้านี้และแจ้งเลขอ้างอิงของคุณ คุณยกเลิกคำขอเองได้จากลิงก์ส่วนตัวจนถึงก่อนรับอุปกรณ์",
  "You can ask to see, correct or delete your data. Contact the desk using the details at the bottom of this page and quote your reference number. You can cancel a request yourself from your private link until you collect",
);

const CONTACT_HEADING = s("ใครเป็นผู้ดูแลข้อมูล", "Who is responsible");
const CONTACT = s(
  "อมธ. ท่าพระจันทร์ เป็นผู้ควบคุมข้อมูลและเป็นผู้ติดต่อด้านการคุ้มครองข้อมูลส่วนบุคคล ช่องทางติดต่ออยู่ท้ายทุกหน้า",
  "TUSU at Tha Prachan is the data controller and the data protection contact. Its contact details are at the bottom of every page",
);

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
