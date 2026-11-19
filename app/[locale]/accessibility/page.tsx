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
import { getSiteSettings } from "@/components/layout/site-settings";
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
const intro = (name: LocaleString): LocaleString => ({
  th: `เว็บไซต์ ${name.th} (${name.en}) ตั้งเป้าให้เป็นไปตามมาตรฐาน WCAG 2.2 ระดับ AA หน้านี้บอกว่าส่วนใดเป็นไปตามมาตรฐานแล้ว ส่วนใดยังไม่เป็น และเพราะเหตุใด บริการนี้ยังอยู่ในช่วงทดลอง เนื้อหาและการใช้งานบางส่วนจึงยังไม่สมบูรณ์`,
  en: `${name.en} aims to meet WCAG 2.2 level AA. This page says what already meets the standard, what does not yet, and why. The service is still in an early phase, so some content and features are incomplete.`,
});

const CONFORMANCE_HEADING: LocaleString = { th: "ผลการตรวจสอบตามมาตรฐาน", en: "How well the site meets the standard" };
const CONFORMANCE_BODY: LocaleString = {
  th: "เว็บไซต์นี้เป็นไปตามมาตรฐาน WCAG 2.2 ระดับ AA บางส่วน หมายความว่ามีบางส่วนของเนื้อหาที่ยังไม่เป็นไปตามมาตรฐานทั้งหมด ดังรายการด้านล่าง",
  en: "This site partly meets WCAG 2.2 level AA. That means some content does not fully meet the standard yet, as listed below.",
};

const WORKS_HEADING: LocaleString = { th: "ส่วนที่เป็นไปตามมาตรฐานแล้ว", en: "What already meets the standard" };
const WORKS_ITEMS: LocaleString[] = [
  {
    th: "โครงสร้างหน้า ทุกหน้ามีลิงก์ข้ามไปยังเนื้อหาหลัก มีหัวข้อหลักหนึ่งหัวข้อ เรียงหัวข้อย่อยตามลำดับ และแบ่งส่วนส่วนหัว เนื้อหาหลัก และส่วนท้ายอย่างชัดเจน",
    en: "Page structure. Every page has a link to skip to the main content, one main heading, subheadings in order, and a clearly separated header, main content and footer.",
  },
  {
    th: "สี ทุกคู่สีของข้อความและปุ่มผ่านการตรวจอัตราส่วนความต่างของสีโดยอัตโนมัติทุกครั้งที่เผยแพร่เว็บไซต์ สีส้ม ชมพู และม่วงอ่อนของแบรนด์ใช้เป็นสีพื้นเท่านั้น ไม่ใช้เป็นสีตัวอักษรบนพื้นสว่าง",
    en: "Colour. Every pair of text and button colours is checked automatically for contrast each time the site is published. The brand orange, pink and lilac are used only as backgrounds, never as text on a light background.",
  },
  {
    th: "แป้นพิมพ์ ทุกฟังก์ชันใช้งานได้ด้วยแป้นพิมพ์อย่างเดียว เห็นตำแหน่งโฟกัสชัดเจนเสมอ และเมนูบนมือถือปิดได้ด้วยปุ่ม Escape โดยโฟกัสกลับไปที่ปุ่มเปิดเมนู",
    en: "Keyboard. Everything can be used with a keyboard alone, you can always see where the focus is, and the mobile menu closes with the Escape key and returns focus to the button that opened it.",
  },
  {
    th: "ขนาดปุ่มและลิงก์ ปุ่มและลิงก์ที่ไม่ได้อยู่ในประโยคมีขนาดอย่างน้อย 24x24 พิกเซล และ 44x44 พิกเซลบนหน้าจอสัมผัส",
    en: "Size of buttons and links. Buttons and links that are not inside a sentence are at least 24 by 24 pixels, and 44 by 44 pixels on a touchscreen.",
  },
  {
    th: "ใช้งานได้แม้ปิดจาวาสคริปต์ การค้นหา ตัวกรอง และการแบ่งหน้าทำงานได้โดยไม่ต้องใช้จาวาสคริปต์",
    en: "Works without JavaScript. Search, filters and page numbers work without JavaScript.",
  },
  {
    th: "การเคลื่อนไหว เว็บไซต์ทำตามการตั้งค่าลดการเคลื่อนไหวของอุปกรณ์ และรองรับโหมดสีบังคับของระบบปฏิบัติการ",
    en: "Motion. The site follows your device's reduce motion setting and supports forced colours mode.",
  },
  {
    th: "ภาษา ทุกหน้ามีทั้งภาษาไทยและภาษาอังกฤษ และระบุภาษาของหน้าไว้ถูกต้อง เพื่อให้โปรแกรมอ่านหน้าจออ่านออกเสียงได้ตรงภาษา",
    en: "Language. Every page is available in Thai and English, and each page states its language correctly so screen readers pronounce it properly.",
  },
];

const GAPS_HEADING: LocaleString = { th: "ส่วนที่ยังไม่เป็นไปตามมาตรฐาน", en: "What does not meet the standard yet" };
const GAPS_ITEMS: LocaleString[] = [
  {
    th: "คู่มือนักศึกษา TU91 ต้นฉบับเป็นภาพสแกนจากหนังสือเล่ม ทีมงานกำลังพิมพ์และจัดหน้าใหม่ทีละส่วน บางหน้าของคู่มือจึงยังไม่มี หรือยังตรวจหัวข้อและคำอธิบายภาพไม่ครบ",
    en: "The TU91 student handbook was scanned from the printed book. We are retyping and laying it out again section by section, so some handbook pages are missing, or their headings and image descriptions have not been fully checked.",
  },
  {
    th: "แบบฟอร์มบางฉบับอยู่บนระบบของหน่วยงานอื่น เช่น Google Forms หรือระบบของมหาวิทยาลัย เว็บไซต์นี้บอกไว้ก่อนที่คุณจะออกจากหน้านี้ แต่ตรวจสอบหรือรับรองการเข้าถึงของระบบเหล่านั้นไม่ได้",
    en: "Some forms are on other organisations' systems, such as Google Forms or a university system. This site tells you before you leave it, but cannot check or guarantee how accessible those systems are.",
  },
  {
    th: "รูปภาพและเอกสารที่นำมาจากแหล่งเดิม เช่น โพสต์ Instagram ของ อมธ. และสภานักศึกษา อาจยังไม่มีคำอธิบายภาพครบทุกภาพ เพราะยังอยู่ระหว่างนำข้อมูลเข้า",
    en: "Images and files brought over from other sources, such as Instagram posts from TUSU and TUSC, may not all have image descriptions yet, because we are still adding this material.",
  },
  {
    th: "บริการนี้ยังอยู่ในช่วงอัลฟา ตามที่แจ้งไว้ในแถบด้านบนของทุกหน้า ข้อมูลบางรายการจึงอาจยังไม่ครบ",
    en: "This service is still in its alpha phase, as the banner at the top of every page says, so some information may be incomplete.",
  },
];

const REPORT_HEADING: LocaleString = { th: "แจ้งปัญหาการเข้าถึง", en: "Tell us about an accessibility problem" };
const REPORT_BODY: LocaleString = {
  th: "หากพบปัญหาการเข้าถึงในเว็บไซต์นี้ ไม่ว่าจะอยู่ในรายการข้างต้นหรือไม่ โปรดติดต่อ อมธ. ท่าพระจันทร์ หรือสภานักศึกษา ท่าพระจันทร์ ตามช่องทางในส่วน “ต้องการความช่วยเหลือ” ที่ท้ายทุกหน้า หากต้องการข้อมูลในรูปแบบอื่น ก็แจ้งได้ทางช่องทางเดียวกัน",
  en: "If you find an accessibility problem on this site, whether or not it is listed above, contact TUSU Tha Prachan or TUSC Tha Prachan using the details under \"Need help\" at the bottom of every page. If you need this information in another format, ask through the same channels.",
};

const PREPARED_LABEL: LocaleString = { th: "จัดทำแถลงการณ์นี้เมื่อ", en: "This statement was prepared on" };
const PREPARED_DATE = "2026-08-09";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/accessibility"),
    title: UI.accessibilityStatement[locale],
    description: intro((await getSiteSettings()).serviceName)[locale],
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
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Stack space={4}>
          <Heading level={1}>{UI.accessibilityStatement[locale]}</Heading>
          <Prose locale={locale}>
            <p>{intro((await getSiteSettings()).serviceName)[locale]}</p>
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
