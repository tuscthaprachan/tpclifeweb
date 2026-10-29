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
import { DEFAULT_LOCALE, isLocale, localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

const s = (th: string, en: string): LocaleString => ({ th, en });

const TITLE = s("ประกาศความเป็นส่วนตัว ของหายและของเก็บได้", "Privacy notice for lost and found");
const INTRO = s(
  "บริการของหายและของเก็บได้ดำเนินการร่วมกันโดย อมธ. และ สภานักศึกษา ท่าพระจันทร์ หน้านี้บอกว่าเราเก็บข้อมูลอะไร เพราะอะไร ใครเห็นได้ และเก็บนานเท่าใด",
  "Lost and found is run jointly by TUSU and TUSC at Tha Prachan. This page says what we collect, why, who can see it and how long we keep it",
);

const WHAT_HEADING = s("ข้อมูลที่เราเก็บและเหตุผล", "What we collect and why");
const WHAT: Array<{ what: LocaleString; why: LocaleString }> = [
  {
    what: s("ชื่อสิ่งของ ลักษณะ สถานที่ และวันที่", "The item's name, description, place and date"),
    why: s(
      "เพื่อค้นหาและจับคู่ของที่หายกับของที่เก็บได้ เจ้าหน้าที่ตรวจสอบก่อน แล้วอาจประกาศต่อสาธารณะ ข้อมูลส่วนนี้ไม่ควรมีชื่อหรือข้อมูลส่วนตัวของใคร",
      "To look for the item and match lost things with found things. Staff check it first, then it may be shown publicly. It should not contain anyone's name or personal details",
    ),
  },
  {
    what: s("รายละเอียดที่มีแต่เจ้าของที่รู้ (รายงานของหาย) หรือคำตอบที่ใช้พิสูจน์ความเป็นเจ้าของ (ขอรับของ)", "The detail only the owner would know (lost report) or your answer proving ownership (claim)"),
    why: s(
      "เพื่อตรวจสอบว่าผู้มารับของเป็นเจ้าของจริง เข้ารหัสไว้ เฉพาะเจ้าหน้าที่ที่ได้รับมอบหมายเห็นได้ และไม่แสดงบนเว็บไซต์เลย",
      "To check that whoever collects the item is the owner. It is encrypted, seen only by the staff handling the case, and never shown on the website",
    ),
  },
  {
    what: s("ชื่อ อีเมล เบอร์โทรศัพท์ หรือไอดีไลน์ และช่องทางที่ให้ติดต่อก่อน", "Your name, email address, phone number or LINE ID, and which to use first"),
    why: s(
      "เพื่อแจ้งความคืบหน้าและนัดรับของคืน เข้ารหัสไว้ เฉพาะเจ้าหน้าที่ที่ได้รับมอบหมายเห็นได้ ผู้แจ้งว่าเก็บของได้ไม่ต้องให้ช่องทางติดต่อก็ได้",
      "To tell you how it is going and to arrange handover. They are encrypted and seen only by the staff handling the case. If you found something, giving contact details is optional",
    ),
  },
  {
    what: s("การยินยอมให้ติดต่อ", "Your agreement to be contacted"),
    why: s("เพื่อบันทึกว่าคุณอนุญาตให้ติดต่อ และเมื่อใด", "To record that you said we may contact you, and when"),
  },
  {
    what: s("ที่อยู่ไอพีและชนิดของเบราว์เซอร์", "Your IP address and browser type"),
    why: s(
      "เพื่อความปลอดภัย จำกัดการใช้งานเกินปกติ และตรวจสอบย้อนหลังว่าใครทำอะไรกับเรื่องนี้ บันทึกไว้ในบันทึกตรวจสอบ ไม่ใช้เพื่อติดตามคุณ",
      "For security, to limit abuse, and to keep a record of who did what on a case. They are kept in the audit log and are not used to track you",
    ),
  },
];

const WHO_HEADING = s("ใครเห็นข้อมูลของคุณ", "Who can see your data");
const WHO = [
  s(
    "เจ้าหน้าที่ อมธ. และ สภานักศึกษา ที่ทำงานของหายและของเก็บได้เท่านั้น ทุกครั้งที่เปิดดูข้อมูลส่วนตัวของคุณจะมีบันทึกไว้",
    "Only TUSU and TUSC staff who work on lost and found. Every time someone opens your personal details, it is logged",
  ),
  s(
    "หน้าเว็บไซต์สาธารณะแสดงเฉพาะชื่อ ลักษณะ สถานที่ และวันที่ของสิ่งของ ไม่แสดงชื่อ ช่องทางติดต่อ หรือรายละเอียดที่เป็นความลับ",
    "The public website shows only the item's name, description, place and date. It never shows names, contact details or the private detail",
  ),
  s(
    "ถ้าคุณขอให้ส่งลิงก์ส่วนตัวทางอีเมล ผู้ให้บริการส่งอีเมลของเราจะได้รับที่อยู่อีเมลของคุณเพื่อส่งข้อความนั้นเท่านั้น",
    "If you ask us to email your private link, our email provider receives your email address for that one message only",
  ),
  s("เราไม่ขายหรือแบ่งปันข้อมูลของคุณให้ผู้อื่นเพื่อการตลาด", "We do not sell your data or share it for marketing"),
];

const COOKIES_HEADING = s("คุกกี้ที่จำเป็น", "Essential cookies");
const COOKIES: Array<{ name: string; purpose: LocaleString; duration: LocaleString }> = [
  {
    name: "lf_journey_lost, lf_journey_found, lf_journey_claim",
    purpose: s(
      "รหัสสุ่มที่ช่วยให้เราจำคำตอบที่คุณกรอกไว้ระหว่างหน้า โดยเก็บคำตอบเข้ารหัสไว้บนเซิร์ฟเวอร์ ไม่ใส่ข้อมูลส่วนตัวไว้ในที่อยู่เว็บหรือในคุกกี้",
      "A random code that lets us keep your answers between pages. The answers stay encrypted on our server. No personal data goes in the web address or the cookie",
    ),
    duration: s("2 ชั่วโมง", "2 hours"),
  },
  {
    name: "lf_track",
    purpose: s(
      "จำเลขอ้างอิงและรหัสลิงก์ส่วนตัวของเรื่องที่คุณเปิดดู เพื่อไม่ต้องเก็บรหัสไว้ในที่อยู่เว็บ",
      "Remembers the reference and private link code of the case you opened, so the code does not stay in the web address",
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
  s(
    "คำตอบที่ยังกรอกไม่เสร็จ: ลบเมื่อพ้น 2 ชั่วโมงนับจากการบันทึกครั้งล่าสุด",
    "Answers you have not sent: deleted 2 hours after you last saved them",
  ),
  s(
    "หน้ายืนยันที่แสดงลิงก์ส่วนตัว: เก็บไว้ 30 นาทีเท่านั้น แล้วลบ เราแสดงลิงก์นี้ซ้ำภายหลังไม่ได้",
    "The confirmation page that shows your private link: kept for 30 minutes only, then deleted. We cannot show the link again later",
  ),
  s(
    "ข้อมูลส่วนบุคคลในเรื่องที่แจ้ง: ลบหลังเรื่องปิดครบ 1 ปี เรื่องจะปิดเมื่อคืนของให้เจ้าของแล้ว ปิดโดยไม่พบของ หรือยกเลิก ของที่เก็บได้จะอยู่ในรายการจนกว่าจะมีผู้รับคืน เรื่องจึงยังเปิดอยู่และเรายังเก็บข้อมูลไว้ จนกว่าเรื่องจะปิด",
    "Personal data in a case: deleted one year after the case closes. A case closes when the item is returned, closed without being found, or withdrawn. Found items stay listed until they are claimed, so that case stays open and we keep its data until it closes",
  ),
  s(
    "หลังลบแล้ว เรายังเก็บเพียงประวัติสถานะของเรื่อง โดยไม่มีข้อมูลส่วนบุคคล",
    "After deletion we keep only the case's status history, with no personal data",
  ),
];

const RIGHTS_HEADING = s("สิทธิ์ของคุณ", "Your rights");
const RIGHTS = s(
  "คุณขอดู แก้ไข หรือลบข้อมูลของคุณได้ หรือถอนความยินยอมได้ทุกเมื่อ ติดต่อเจ้าหน้าที่ตามช่องทางด้านล่างของหน้านี้ และแจ้งเลขอ้างอิง คุณยกเลิกรายงานของหายด้วยตนเองได้ในหน้าติดตามเรื่อง",
  "You can ask to see, correct or delete your data, or withdraw your consent, at any time. Contact the desk using the details at the bottom of this page and quote your reference number. You can withdraw a lost report yourself on the tracking page",
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
