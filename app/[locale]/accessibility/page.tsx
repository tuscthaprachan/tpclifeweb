/**
 * The accessibility statement. WCAG 2.2 AA is the target for every page on
 * this site (CONTRIBUTING.md), and this page is where that claim is checked
 * against reality: what is known to conform, what is not yet, and how to
 * reach TUSU/TUSC Tha Prachan if something does not work.
 *
 * Written for a real reader, not boilerplate: every claim below is something
 * this repository actually does (checked contrast, a real skip link, forms
 * that work with JavaScript off) or a real, named gap (the TU91 handbook
 * still being re-authored from scanned images, third-party form providers
 * this site does not control). Do not add a claim here that is not true of
 * the current build.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Prose, Stack, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";

/*
 * TODO: add to UI strings. This entire page is page-specific prose with no
 * shared vocabulary equivalent in lib/i18n/strings.ts beyond the nav label
 * (UI.accessibilityStatement). Hardcoded here per CONTRIBUTING.md's own
 * instruction for a missing shared string, and reported in the harden
 * agent's final report rather than invented as a synonym of something else.
 */
const INTRO: LocaleString = {
  th: "เว็บไซต์ท้ายท่าพระจันทร์ (TPC Life) มีเป้าหมายให้เป็นไปตามมาตรฐาน WCAG 2.2 ระดับ AA นี่คือแถลงการณ์ที่ตรงไปตรงมาว่าส่วนใดเป็นไปตามมาตรฐานแล้ว ส่วนใดยังไม่เป็น และเหตุใด บริการนี้ยังอยู่ในระยะทดลอง เนื้อหาและฟังก์ชันบางส่วนจึงยังไม่สมบูรณ์",
  en: "TPC Life aims to meet WCAG 2.2 level AA. This is a plain account of what already conforms, what does not yet, and why. The service is still in an early phase, so some content and functionality remain incomplete.",
};

const CONFORMANCE_HEADING: LocaleString = { th: "สถานะการปฏิบัติตามมาตรฐาน", en: "Conformance status" };
const CONFORMANCE_BODY: LocaleString = {
  th: "เนื้อหาส่วนใหญ่ของเว็บไซต์นี้เป็นไปตามมาตรฐาน WCAG 2.2 ระดับ AA บางส่วนแต่ไม่ทั้งหมด (partially conformant) เนื่องจากมีข้อยกเว้นที่ระบุไว้ด้านล่าง",
  en: "This site is partially conformant with WCAG 2.2 level AA. Partially conformant means some parts of the content do not fully conform to the accessibility standard, as listed below.",
};

const WORKS_HEADING: LocaleString = { th: "สิ่งที่เป็นไปตามมาตรฐานแล้ว", en: "What is known to conform" };
const WORKS_ITEMS: LocaleString[] = [
  {
    th: "ทุกหน้ามีลิงก์ข้ามไปยังเนื้อหาหลัก โครงสร้างหัวข้อที่ถูกต้อง มี h1 เดียวต่อหน้า และมีจุดสังเกต (landmark) main, header และ footer อย่างละหนึ่ง",
    en: "Every page has a skip link, a correct heading structure, exactly one h1, and single main, header and footer landmarks.",
  },
  {
    th: "สี ทุกคู่สีที่ใช้แสดงข้อความและตัวควบคุมผ่านการตรวจสอบอัตราส่วนความคมชัดอัตโนมัติกว่า 110 คู่ทุกครั้งที่มีการ build สีสามสีของแบรนด์ (ส้ม ชมพู ม่วงอ่อน) ใช้เป็นพื้นหลังเท่านั้น ไม่เคยใช้เป็นสีตัวอักษรบนพื้นสว่าง",
    en: "Colour. Every text and control colour pair is checked automatically against 110 WCAG contrast assertions on every build. The three brand pastels (orange, pink, lilac) are used only as fills, never as text on a light surface.",
  },
  {
    th: "แป้นพิมพ์ ทุกฟังก์ชันใช้งานได้ด้วยแป้นพิมพ์เพียงอย่างเดียว ตัวชี้โฟกัส (focus indicator) มองเห็นได้ชัดเจนเสมอ และเมนูสำหรับมือถือปิดได้ด้วยปุ่ม Escape พร้อมคืนโฟกัสกลับไปยังปุ่มเปิดเมนู",
    en: "Keyboard. Every function is operable by keyboard alone, the focus indicator is always visible, and the mobile menu closes on Escape and returns focus to the button that opened it.",
  },
  {
    th: "ขนาดเป้าหมาย ปุ่มและลิงก์ที่ไม่ได้อยู่กลางประโยคมีขนาดอย่างน้อย 24x24 พิกเซล และ 44x44 พิกเซลบนอุปกรณ์สัมผัส",
    en: "Target size. Buttons and links outside running text are at least 24 by 24 CSS pixels, and 44 by 44 on a touch pointer.",
  },
  {
    th: "การเสริมความสามารถแบบก้าวหน้า (progressive enhancement) การค้นหา ตัวกรอง และการแบ่งหน้าทำงานได้แม้ปิดจาวาสคริปต์ เพราะทุกอย่างขับเคลื่อนด้วยแบบฟอร์ม GET และพารามิเตอร์ในลิงก์จริง",
    en: "Progressive enhancement. Search, filtering and pagination all work with JavaScript switched off, because every one of them is driven by a real GET form or a plain link, not a script.",
  },
  {
    th: "การเคลื่อนไหว เว็บไซต์เคารพการตั้งค่า “ลดการเคลื่อนไหว” ของระบบ และรองรับโหมดสีแบบบังคับ (forced colours) ของระบบปฏิบัติการ",
    en: "Motion. The site respects the operating system's \"reduce motion\" setting, and supports forced-colours mode.",
  },
  {
    th: "ภาษา ทุกหน้ามีทั้งภาษาไทยและภาษาอังกฤษ แอตทริบิวต์ lang ของหน้าตรงกับภาษาที่แสดง และมีลิงก์ hreflang เชื่อมโยงไปกลับระหว่างสองภาษาเสมอ",
    en: "Language. Every page exists in both Thai and English, the page's lang attribute matches what is shown, and reciprocal hreflang links connect the two versions.",
  },
];

const GAPS_HEADING: LocaleString = { th: "สิ่งที่ยังไม่เป็นไปตามมาตรฐาน", en: "What does not conform yet" };
const GAPS_ITEMS: LocaleString[] = [
  {
    th: "คู่มือนักศึกษา TU91: เนื้อหาต้นฉบับเป็นภาพสแกนจากเอกสารตัวเล่ม ทีมงานกำลังพิมพ์และจัดโครงสร้างเนื้อหาใหม่ทีละส่วน ระหว่างนี้บางหน้าของคู่มืออาจยังไม่มี หรือมีแต่ยังไม่ผ่านการตรวจสอบโครงสร้างหัวข้อและข้อความทางเลือกอย่างสมบูรณ์",
    en: "The TU91 student handbook. Its source material is scanned images of a printed book. Content is being re-typed and re-structured section by section; until that finishes, some handbook pages are missing or have not yet had their heading structure and alt text fully checked.",
  },
  {
    th: "แบบฟอร์มปลายทางบางฉบับอยู่บนระบบของหน่วยงานภายนอก (เช่น Google Forms หรือระบบของมหาวิทยาลัย) เว็บไซต์นี้ระบุไว้อย่างชัดเจนก่อนออกจากหน้าเว็บ แต่ไม่สามารถควบคุมหรือรับประกันการเข้าถึงของระบบปลายทางเหล่านั้นได้",
    en: "Some destination forms are hosted on third-party systems (for example Google Forms, or a university system). This site labels the link clearly before you leave it, but does not control, and cannot guarantee, the accessibility of those third-party destinations.",
  },
  {
    th: "รูปภาพและเอกสารแนบที่นำเข้าจากแหล่งข้อมูลเดิม (เช่น โพสต์ Instagram ของ อมธ./สภานักศึกษา) อาจมีคำอธิบายภาพ (alt text) ที่ยังไม่ครบทุกภาพในระยะแรกของการนำเข้าข้อมูล",
    en: "Images and attachments carried over from source material (for example TUSU or TUSC's own Instagram posts) may not all have alt text checked yet, this early in bringing that material in.",
  },
  {
    th: "เนื้อหาบางส่วนยังอยู่ระหว่างทดลอง (alpha) ตามที่ระบุไว้ในแถบแจ้งเตือนด้านบนของทุกหน้า ข้อมูลบางรายการอาจยังไม่ครบถ้วน",
    en: "As the banner at the top of every page says, this service is still in an alpha phase and some information is incomplete.",
  },
];

const REPORT_HEADING: LocaleString = { th: "การแจ้งปัญหาการเข้าถึง", en: "Reporting an accessibility problem" };
const REPORT_BODY: LocaleString = {
  th: "หากพบปัญหาการเข้าถึงในเว็บไซต์นี้ ไม่ว่าจะเป็นส่วนที่ระบุไว้ข้างต้นหรือไม่ก็ตาม โปรดติดต่อ อมธ. ท่าพระจันทร์ หรือสภานักศึกษา ท่าพระจันทร์ ผ่านช่องทางที่ระบุไว้ในหัวข้อ “ต้องการความช่วยเหลือ” ท้ายทุกหน้าของเว็บไซต์",
  en: "If you find an accessibility problem on this site, whether or not it is listed above, contact TUSU Tha Prachan or TUSC Tha Prachan through the channels under \"Need help\" at the bottom of every page.",
};

const PREPARED_LABEL: LocaleString = { th: "จัดทำแถลงการณ์นี้เมื่อ", en: "This statement was prepared on" };
const PREPARED_DATE = "2026-08-09";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/accessibility"),
    title: UI.accessibilityStatement[locale],
    description: INTRO[locale],
  };
}

export default async function AccessibilityStatementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[{ label: UI.home[locale], path: "/" }, { label: UI.accessibilityStatement[locale] }]}
      />
      <Stack space={8} className="py-[var(--space-8)]">
        <Stack space={4}>
          <Heading level={1}>{UI.accessibilityStatement[locale]}</Heading>
          <Prose locale={locale}>
            <p>{INTRO[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{CONFORMANCE_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{CONFORMANCE_BODY[locale]}</p>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{WORKS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <ul>
              {WORKS_ITEMS.map((item) => (
                <li key={item.en}>{item[locale]}</li>
              ))}
            </ul>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{GAPS_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <ul>
              {GAPS_ITEMS.map((item) => (
                <li key={item.en}>{item[locale]}</li>
              ))}
            </ul>
          </Prose>
        </Stack>

        <Stack space={2} as="section">
          <Heading level={2}>{REPORT_HEADING[locale]}</Heading>
          <Prose locale={locale}>
            <p>{REPORT_BODY[locale]}</p>
          </Prose>
        </Stack>

        <p className="m-0 text-sm text-ink-600">
          {PREPARED_LABEL[locale]} <Timestamp value={PREPARED_DATE} locale={locale} />
        </p>
      </Stack>
    </Container>
  );
}
