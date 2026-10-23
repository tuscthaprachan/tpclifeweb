import {
  EXTERNAL_SERVICES,
  SOURCE_DOCUMENTS,
  STUDENT_BODIES,
} from "../../../data/harvested-inventory";
import type { ExternalLinkJson } from "../schema/content/common";
import { contentPages } from "../schema/content/pages";
import { excludedSet, published, rich, type Bi, type SeedDb } from "./util";

/**
 * The four hand-built guide pages seeded here: useful online
 * services, rules and documents, about TUSU and about TUSC. Their real content
 * is their link lists. SOURCE_DOCUMENTS notes are English-only maintainer
 * notes and are deliberately not copied into the reader-facing text.
 */

export interface PageSeed {
  kind: "welfare" | "guide";
  slug: string;
  title: Bi;
  summary: Bi;
  /** Portable Text block arrays, converted at write time. */
  bodyTh: readonly unknown[];
  bodyEn: readonly unknown[];
  category: "transport" | "welfare" | "activity" | "governance";
  relatedLinks?: ExternalLinkJson[];
  lastReviewed?: string;
  order?: number;
}

/** One plain Portable Text paragraph. */
function paragraph(text: string) {
  return {
    _type: "block",
    _key: "p",
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: "s", text, marks: [] }],
  };
}

export async function upsertContentPage(db: SeedDb, page: PageSeed): Promise<string> {
  const [row] = await db
    .insert(contentPages)
    .values({
      ...published(),
      kind: page.kind,
      slug: page.slug,
      titleTh: page.title.th,
      titleEn: page.title.en,
      summaryTh: page.summary.th,
      summaryEn: page.summary.en,
      bodyTh: rich(page.bodyTh),
      bodyEn: rich(page.bodyEn),
      category: page.category,
      relatedLinks: page.relatedLinks ?? [],
      lastReviewed: page.lastReviewed ?? null,
      sortOrder: page.order ?? null,
    })
    .onConflictDoUpdate({ target: [contentPages.kind, contentPages.slug], set: excludedSet(contentPages) })
    .returning({ id: contentPages.id });
  return row!.id;
}

const SHUTTLE_TIMETABLE_DESCRIPTION: Bi = {
  en: "Published only as an image in an Instagram post, not as a timetable on this site.",
  th: "เผยแพร่เป็นเพียงภาพในโพสต์ Instagram เท่านั้น ยังไม่ใช่ตารางเวลาบนเว็บไซต์นี้",
};

const regulation = SOURCE_DOCUMENTS.find((d) => d.key === "studentActivityRegulation");
const REGULATION_LINK: ExternalLinkJson = {
  label: regulation?.title ?? STUDENT_BODIES.governedBy,
  url: regulation?.url ?? "",
};

/** `established` is a year from the source; the Buddhist year is arithmetic (+543), not invention. */
const established = (year: number): Bi => ({
  en: `Established in ${year}.`,
  th: `ก่อตั้งขึ้นในปี พ.ศ. ${year + 543}`,
});

export const GUIDE_PAGES: PageSeed[] = [
  {
    kind: "guide",
    slug: "useful-online-services",
    title: { th: "บริการออนไลน์ที่ใช้บ่อย", en: "Useful online services" },
    summary: {
      th: "ลิงก์ตรงไปยังระบบจอง เครื่องมือแจ้งปัญหา และช่องทางดูแลสุขภาพใจที่นักศึกษาธรรมศาสตร์ท่าพระจันทร์ใช้บ่อยที่สุด",
      en: "Direct links to the booking systems, reporting tools and wellbeing lines Thammasat Tha Prachan students use most often.",
    },
    bodyTh: [paragraph("แต่ละลิงก์เปิดไปยังระบบของหน่วยงานนั้นโดยตรง ตรวจสอบว่าต้องเข้าสู่ระบบก่อนหรือไม่ก่อนเริ่มใช้งาน")],
    bodyEn: [paragraph("Each link opens the organisation's own system. Check whether it needs a sign-in before you start.")],
    category: "welfare",
    relatedLinks: EXTERNAL_SERVICES.map((service) => ({
      label: service.name,
      url: service.url,
      ...("note" in service ? { description: service.note } : {}),
      requiresSignIn: service.requiresSignIn,
    })),
    lastReviewed: "2026-08-07",
  },
  {
    kind: "guide",
    slug: "rules-and-documents",
    title: { th: "ระเบียบและเอกสารอ้างอิง", en: "Rules and reference documents" },
    summary: {
      th: "ข้อบังคับและเอกสารอ้างอิงอย่างเป็นทางการของธรรมศาสตร์ท่าพระจันทร์ บางฉบับเผยแพร่เป็นไฟล์ PDF ไฟล์ Drive หรือคู่มือที่สแกนไว้เท่านั้น",
      en: "Official regulations and reference material for Thammasat Tha Prachan. Some are only published as a PDF, a Drive file or a scanned handbook.",
    },
    bodyTh: [
      paragraph(
        "เอกสารเหล่านี้ยังไม่ได้ถูกเขียนใหม่เป็นเนื้อหาในเว็บไซต์ จึงเปิดเป็นไฟล์ PDF ไฟล์ Drive หรือในกรณีของตารางรถรับส่ง เป็นโพสต์ใน Instagram",
      ),
    ],
    bodyEn: [
      paragraph(
        "These have not been rewritten as native page content yet, so they open as PDFs, Drive files or, for the shuttle timetable, an Instagram post.",
      ),
    ],
    category: "governance",
    relatedLinks: SOURCE_DOCUMENTS.map((doc) => ({
      label: doc.title,
      url: doc.url,
      ...(doc.key === "shuttleTimetable" ? { description: SHUTTLE_TIMETABLE_DESCRIPTION } : {}),
      requiresSignIn: false,
    })),
    lastReviewed: "2026-08-07",
  },
  {
    kind: "guide",
    slug: "about-tusu",
    title: STUDENT_BODIES.tusu.name,
    summary: {
      th: "องค์การนักศึกษาฝ่ายบริหารประจำธรรมศาสตร์ท่าพระจันทร์ ดูแลงบประมาณ กิจกรรมระดับมหาวิทยาลัย และสวัสดิการนักศึกษา",
      en: "The executive student body at Thammasat Tha Prachan, responsible for budget, university-wide activities and student welfare.",
    },
    bodyTh: [paragraph(STUDENT_BODIES.tusu.role.th), paragraph(established(STUDENT_BODIES.tusu.established).th)],
    bodyEn: [paragraph(STUDENT_BODIES.tusu.role.en), paragraph(established(STUDENT_BODIES.tusu.established).en)],
    category: "governance",
    relatedLinks: [
      REGULATION_LINK,
      { label: { th: "ลิงก์ทรีของ อมธ. ท่าพระจันทร์", en: "TUSU Tha Prachan Linktree" }, url: STUDENT_BODIES.tusu.linktree },
    ],
    lastReviewed: "2026-08-07",
  },
  {
    kind: "guide",
    slug: "about-tusc",
    title: STUDENT_BODIES.tusc.name,
    summary: {
      th: "ฝ่ายนิติบัญญัติและตรวจสอบประจำธรรมศาสตร์ท่าพระจันทร์ พิจารณาระเบียบกิจกรรมนักศึกษาและตรวจสอบการดำเนินงานขององค์การนักศึกษา",
      en: "The legislative and scrutiny body at Thammasat Tha Prachan, approving student activity rules and scrutinising the Union's work.",
    },
    bodyTh: [paragraph(STUDENT_BODIES.tusc.role.th), paragraph(established(STUDENT_BODIES.tusc.established).th)],
    bodyEn: [paragraph(STUDENT_BODIES.tusc.role.en), paragraph(established(STUDENT_BODIES.tusc.established).en)],
    category: "governance",
    relatedLinks: [
      REGULATION_LINK,
      { label: { th: "ลิงก์ทรีของสภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan Linktree" }, url: STUDENT_BODIES.tusc.linktree },
      {
        label: { th: "Facebook สภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan Facebook" },
        url: `https://facebook.com/${STUDENT_BODIES.tusc.facebook}`,
      },
      {
        label: { th: "Instagram สภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan Instagram" },
        url: `https://instagram.com/${STUDENT_BODIES.tusc.instagram}`,
      },
      {
        label: { th: "อีเมลสภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan email" },
        url: `mailto:${STUDENT_BODIES.tusc.email}`,
      },
    ],
    lastReviewed: "2026-08-16",
  },
];

export async function seedGuidePages(db: SeedDb): Promise<void> {
  for (const page of GUIDE_PAGES) await upsertContentPage(db, page);
}

