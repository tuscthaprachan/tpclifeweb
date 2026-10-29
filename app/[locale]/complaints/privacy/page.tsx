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
import { DEFAULT_LOCALE, isLocale, localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

const s = (th: string, en: string): LocaleString => ({ th, en });

const TITLE = s("ประกาศความเป็นส่วนตัว ข้อร้องเรียน", "Privacy notice for complaints");
const INTRO = s(
  "บริการข้อร้องเรียนดำเนินการร่วมกันโดย อมธ. และ สภานักศึกษา ท่าพระจันทร์ หน้านี้บอกว่าเราเก็บข้อมูลอะไร เพราะอะไร ใครเห็นได้ และเก็บนานเท่าใด",
  "Complaints are handled jointly by TUSU and TUSC at Tha Prachan. This page says what we collect, why, who can see it and how long we keep it",
);

const WHAT_HEADING = s("ข้อมูลที่เราเก็บและเหตุผล", "What we collect and why");
const WHAT: Array<{ what: LocaleString; why: LocaleString }> = [
  {
    what: s("ข้อความที่คุณเขียน: เกิดอะไรขึ้น เมื่อไรและที่ไหน และสิ่งที่คุณอยากให้แก้ไข", "What you write: what happened, when and where, and what would put it right"),
    why: s(
      "เพื่อให้เจ้าหน้าที่เข้าใจและดำเนินการกับเรื่องของคุณ ข้อความอาจมีข้อมูลส่วนตัวของคุณหรือของผู้อื่น เราจึงเข้ารหัสทั้งหมด และเจ้าหน้าที่เปิดอ่านได้เมื่อกด “แสดง” เท่านั้น ซึ่งมีบันทึกไว้ทุกครั้ง",
      "So staff can understand and act on your complaint. It may contain personal details about you or other people, so all of it is encrypted, and staff can read it only by choosing Show, which is logged every time",
    ),
  },
  {
    what: s("ไฟล์หลักฐานที่คุณแนบ (ไม่บังคับ)", "Evidence files you attach (optional)"),
    why: s(
      "เพื่อประกอบการพิจารณา เก็บเป็นไฟล์ส่วนตัวที่ไม่มีลิงก์สาธารณะ ชื่อไฟล์เข้ารหัสไว้ เจ้าหน้าที่เปิดดูได้ผ่านลิงก์ชั่วคราวเมื่อกด “แสดง” ซึ่งมีบันทึกไว้",
      "To help look into the complaint. Files are private, with no public link, and their names are encrypted. Staff open them through a short-lived link when they choose Show, which is logged",
    ),
  },
  {
    what: s("ชื่อ อีเมล เบอร์โทรศัพท์ หรือไอดีไลน์ (เฉพาะเมื่อคุณเลือกให้ข้อมูล)", "Your name, email address, phone number or LINE ID (only if you choose to give them)"),
    why: s(
      "เพื่อแจ้งความคืบหน้าและถามข้อมูลเพิ่ม เข้ารหัสไว้ หากคุณไม่ระบุตัวตน เราไม่เก็บข้อมูลเหล่านี้เลย หากคุณเลือกไม่เปิดเผยชื่อ เจ้าหน้าที่ทั่วไปจะไม่เห็นชื่อของคุณ มีเพียงหัวหน้าหน่วยงานที่เห็นได้เมื่อจำเป็น",
      "So we can tell you how it is going and ask for more. Encrypted. If you stay anonymous we hold none of these. If you keep your name back, ordinary handlers do not see it; only a service lead can, if it is needed",
    ),
  },
  {
    what: s("การยินยอมให้ติดต่อ", "Your agreement to be contacted"),
    why: s("เพื่อบันทึกว่าคุณอนุญาตให้ติดต่อ และเมื่อใด", "To record that you said we may contact you, and when"),
  },
  {
    what: s("คะแนนความพึงพอใจ และความเห็น (ไม่บังคับ) หลังเรื่องมีผล", "Your satisfaction score, and a comment (optional), after an outcome"),
    why: s(
      "เพื่อปรับปรุงบริการ ความเห็นเข้ารหัสไว้ คะแนนไม่มีข้อมูลส่วนตัวและเราเก็บไว้เพื่อรายงานผลการดำเนินงาน",
      "To improve the service. The comment is encrypted. The score holds no personal data and is kept for performance reporting",
    ),
  },
  {
    what: s("ที่อยู่ไอพีและชนิดของเบราว์เซอร์", "Your IP address and browser type"),
    why: s(
      "เพื่อความปลอดภัย จำกัดการใช้งานเกินปกติ และตรวจสอบย้อนหลังว่าใครทำอะไรกับเรื่องนี้ บันทึกไว้ในบันทึกตรวจสอบ ไม่ใช้เพื่อติดตามคุณ แม้คุณจะไม่ระบุตัวตนก็ตาม",
      "For security, to limit abuse, and to keep a record of who did what on a complaint. They are kept in the audit log and are not used to track you, even if you stay anonymous",
    ),
  },
];

const WHO_HEADING = s("ใครเห็นข้อมูลของคุณ", "Who can see your data");
const WHO = [
  s(
    "เจ้าหน้าที่ อมธ. และ สภานักศึกษา ที่ทำงานข้อร้องเรียนเท่านั้น ทั้งสองหน่วยงานใช้คิวเดียวกัน และระบบบันทึกว่าหน่วยงานใดดำเนินการ ทุกครั้งที่เปิดดูข้อความ ไฟล์ หรือข้อมูลติดต่อของคุณจะมีบันทึกไว้",
    "Only TUSU and TUSC staff who handle complaints. Both bodies share one queue, and each action records which one acted. Every time someone opens your text, files or contact details, it is logged",
  ),
  s(
    "เรื่องในหัวข้ออ่อนไหว เช่น การคุกคามหรือการเลือกปฏิบัติ และความปลอดภัย เจ้าหน้าที่ที่ได้รับมอบหมายตามชื่อเท่านั้นที่เห็นได้ แม้แต่ผู้ดูแลระบบก็ไม่เห็นหากไม่ได้อยู่ในรายชื่อ",
    "Complaints in sensitive categories, such as harassment or discrimination, and safety, are visible only to named members of staff. Even an administrator cannot see them unless named",
  ),
  s(
    "หน้าเว็บไซต์สาธารณะไม่แสดงข้อร้องเรียนใดเลย",
    "The public website never shows a complaint",
  ),
  s(
    "ถ้าคุณขอให้ส่งลิงก์ส่วนตัวทางอีเมล หรือเจ้าหน้าที่แจ้งความคืบหน้าทางอีเมล ผู้ให้บริการส่งอีเมลของเราจะได้รับที่อยู่อีเมลของคุณเพื่อส่งข้อความนั้นเท่านั้น อีเมลจะไม่มีข้อความร้องเรียนของคุณ",
    "If you ask us to email your private link, or staff email you about progress, our email provider receives your email address for those messages only. The emails never contain what you wrote",
  ),
  s("เราไม่ขายหรือแบ่งปันข้อมูลของคุณให้ผู้อื่นเพื่อการตลาด", "We do not sell your data or share it for marketing"),
];

const ANON_HEADING = s("ถ้าคุณไม่ระบุตัวตน", "If you stay anonymous");
const ANON = s(
  "เราไม่เก็บชื่อหรือช่องทางติดต่อของคุณ เราจึงติดต่อคุณไม่ได้ และกู้ลิงก์ที่หายให้ไม่ได้ คุณติดตามเรื่องได้ด้วยลิงก์ส่วนตัวที่แสดงให้ครั้งเดียวเท่านั้น โปรดเก็บลิงก์ไว้",
  "We hold no name or way to reach you, so we cannot contact you and cannot recover a lost link. You follow the complaint only with the private link we show once. Please keep it",
);

const COOKIES_HEADING = s("คุกกี้ที่จำเป็น", "Essential cookies");
const COOKIES: Array<{ name: string; purpose: LocaleString; duration: LocaleString }> = [
  {
    name: "cp_journey",
    purpose: s(
      "รหัสสุ่มที่ช่วยให้เราจำคำตอบที่คุณกรอกไว้ระหว่างหน้า โดยเก็บคำตอบเข้ารหัสไว้บนเซิร์ฟเวอร์ ไม่ใส่ข้อมูลส่วนตัวไว้ในที่อยู่เว็บหรือในคุกกี้",
      "A random code that lets us keep your answers between pages. The answers stay encrypted on our server. No personal data goes in the web address or the cookie",
    ),
    duration: s("2 ชั่วโมง", "2 hours"),
  },
  {
    name: "cp_track",
    purpose: s(
      "จำเลขอ้างอิงและรหัสลิงก์ส่วนตัวของเรื่องที่คุณเปิดดู เพื่อไม่ต้องเก็บรหัสไว้ในที่อยู่เว็บ",
      "Remembers the reference and private link code of the complaint you opened, so the code does not stay in the web address",
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
  s("คำตอบและไฟล์ที่ยังไม่ได้ส่ง: ลบเมื่อพ้น 2 ชั่วโมงนับจากการบันทึกครั้งล่าสุด", "Answers and files you have not sent: deleted 2 hours after you last saved them"),
  s(
    "หน้ายืนยันที่แสดงลิงก์ส่วนตัว: เก็บไว้ 30 นาทีเท่านั้น แล้วลบ เราแสดงลิงก์นี้ซ้ำภายหลังไม่ได้",
    "The confirmation page that shows your private link: kept for 30 minutes only, then deleted. We cannot show the link again later",
  ),
  s(
    `ข้อมูลส่วนบุคคลในเรื่องที่แจ้ง: ลบหลังเรื่องปิดครบ 1 ปี เรื่องมีผลแล้วจะปิดโดยอัตโนมัติเมื่อพ้น ${REOPEN_WINDOW_DAYS} วัน หากคุณเปิดเรื่องอีกครั้ง การนับเวลาจะหยุดไว้`,
    `Personal data in a complaint: deleted one year after it closes. A resolved complaint closes by itself after ${REOPEN_WINDOW_DAYS} days; if you reopen it the clock stops`,
  ),
  s(
    "หลังลบแล้ว เรายังเก็บเพียงประวัติสถานะของเรื่อง วันที่ตามเป้าหมาย หัวข้อ และคะแนนความพึงพอใจ โดยไม่มีข้อมูลส่วนบุคคล",
    "After deletion we keep only the complaint's status history, target dates, category and satisfaction score, with no personal data",
  ),
];

const RIGHTS_HEADING = s("สิทธิ์ของคุณ", "Your rights");
const RIGHTS = s(
  "คุณขอดู แก้ไข หรือลบข้อมูลของคุณได้ หรือถอนความยินยอมได้ทุกเมื่อ ติดต่อเจ้าหน้าที่ตามช่องทางด้านล่างของหน้านี้ และแจ้งเลขอ้างอิง คุณยกเลิกเรื่องร้องเรียนด้วยตนเองได้ในหน้าติดตามเรื่อง",
  "You can ask to see, correct or delete your data, or withdraw your consent, at any time. Contact the desk using the details at the bottom of this page and quote your reference number. You can withdraw a complaint yourself on the tracking page",
);

const CONTACT_HEADING = s("ใครเป็นผู้ดูแลข้อมูล", "Who is responsible");
const CONTACT = s(
  "อมธ. และ สภานักศึกษา ท่าพระจันทร์ เป็นผู้ควบคุมข้อมูลร่วมกันและเป็นผู้ติดต่อด้านการคุ้มครองข้อมูลร่วมกัน ช่องทางติดต่ออยู่ด้านล่างของทุกหน้า",
  "TUSU and TUSC at Tha Prachan are joint controllers and the joint data protection contact. Their contact details are at the bottom of every page",
);

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
            <Link href={localePath(locale, "/complaints")} className="text-action underline">
              {UI.cpServiceName[locale]}
            </Link>
          </p>
        </Stack>
      </Stack>
    </Container>
  );
}
