/**
 * TU91 freshman handbook content ("The magic of TPC", academic year 2568),
 * for the Postgres seed.
 *
 * This is DATA: there is no client or run script. The block
 * builders still emit Portable Text because that is how the content was
 * authored; lib/db/seed/handbook.ts converts each block array to a ProseMirror
 * document with `portableTextToDoc` before writing. Em dashes in the source
 * text were replaced with a colon (after a label) or a comma, to satisfy
 * scripts/check-i18n.mjs. Every fact carries its `sourcePage` comment.
 *
 * Do not add new content here: edit it in the admin console.
 */

import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ *
 * Builders
 *
 * Small helpers that build Portable Text block arrays and opening hours.
 *
 * ------------------------------------------------------------------ */

/** A short, stable-enough key. Portable Text blocks carry one on every object in an array. */
function key(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

function slug(current: string) {
  return { _type: "slug" as const, current };
}

/**
 * A document id must not contain a dot, so dots in a name become hyphens.
 */
function docId(type: string, name: string): string {
  return `${type}-${name.replace(/\./g, "-")}`;
}

type Bilingual = { th: string; en: string };

function localeString(th: string, en: string) {
  return { _type: "localeString" as const, th, en };
}

function localeText(th: string, en: string) {
  return { _type: "localeText" as const, th, en };
}

type BlockSpec =
  | { h: string }
  | { h3: string }
  | { p: string }
  | { li: string }
  | { ol: string };

/** One Portable Text block. */
function block(text: string, style: string, listItem?: "bullet" | "number") {
  return {
    _type: "block" as const,
    _key: key(),
    style,
    markDefs: [],
    children: [{ _type: "span" as const, _key: key(), text, marks: [] }],
    ...(listItem ? { listItem, level: 1 } : {}),
  };
}

function blocks(specs: BlockSpec[]) {
  return specs.map((spec) => {
    if ("h" in spec) return block(spec.h, "h2");
    if ("h3" in spec) return block(spec.h3, "h3");
    if ("li" in spec) return block(spec.li, "normal", "bullet");
    if ("ol" in spec) return block(spec.ol, "normal", "number");
    return block(spec.p, "normal");
  });
}

function localeBlock(th: BlockSpec[], en: BlockSpec[]) {
  return { _type: "localeBlock" as const, th: blocks(th), en: blocks(en) };
}

/** One `openingHours` array entry. */
function hours(daysOfWeek: number[], opens: string, closes: string, note?: Bilingual) {
  return {
    _type: "openingHours" as const,
    _key: key(),
    daysOfWeek,
    opens,
    closes,
    ...(note ? { note: localeString(note.th, note.en) } : {}),
  };
}

const MON_FRI = [1, 2, 3, 4, 5];
const MON_SAT = [1, 2, 3, 4, 5, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKEND = [0, 6];

/** Shared note: nearly every TU service closes on public holidays. */
const CLOSED_PUBLIC_HOLIDAYS: Bilingual = {
  th: "ปิดวันหยุดนักขัตฤกษ์",
  en: "Closed on public holidays",
};

function contact(channel: string, value: string, label?: Bilingual) {
  return {
    _type: "organisationContact" as const,
    _key: key(),
    channel,
    value,
    ...(label ? { label: localeString(label.th, label.en) } : {}),
  };
}

export type SeedDoc = { _id: string; _type: string; [field: string]: unknown };

/* ------------------------------------------------------------------ *
 * FAQ: handbook pages 31 and 32
 *
 * The handbook prints these as a flat Q&A list. Each becomes its own `faq`
 * document so it can be ranked in search on its own, which is why the type
 * exists (see the comment on the faq schema). `order` follows the printed
 * order, so the site lists them the way a student read them in the book.
 * ------------------------------------------------------------------ */

type FaqSpec = {
  slug: string;
  order: number;
  category: "transport" | "welfare" | "activity" | "governance";
  question: Bilingual;
  answerTh: BlockSpec[];
  answerEn: BlockSpec[];
};

const FAQS: FaqSpec[] = [
  {
    slug: "where-to-complain", // sourcePage: 31
    order: 1,
    category: "governance",
    question: {
      th: "สามารถร้องเรียนได้ที่ไหน",
      en: "Where can I make a complaint?",
    },
    answerTh: [
      {
        p: "หากเป็นเรื่องการลงทะเบียนเรียน สามารถติดต่อได้ที่คณะและสำนักงานทะเบียนนักศึกษา",
      },
      {
        p: "หากต้องการร้องเรียนกับทาง อมธ. ท่าพระจันทร์ สามารถคลิกที่ลิงก์ใต้โปรไฟล์ในทุกช่องทางติดต่อของ อมธ.",
      },
    ],
    answerEn: [
      {
        p: "For anything about course registration, contact your faculty and the Office of the Registrar.",
      },
      {
        p: "To complain to TUSU Tha Prachan, use the link in the bio on any of TUSU's social media profiles.",
      },
    ],
  },
  {
    slug: "is-there-parking", // sourcePage: 31
    order: 2,
    category: "transport",
    question: { th: "มีที่จอดรถไหม", en: "Is there parking on campus?" },
    answerTh: [
      {
        p: "ที่จอดรถภายในมหาวิทยาลัยเป็นสวัสดิการสำหรับนักศึกษาปริญญาโทและบุคลากรของมหาวิทยาลัยเท่านั้น",
      },
      {
        p: "นักศึกษาทุกชั้นปีสามารถนำรถเข้ามาจอดภายในมหาวิทยาลัยได้ตั้งแต่เวลา 16.30 น. เป็นต้นไป",
      },
      {
        p: "นักศึกษาปริญญาตรีสามารถจอดรถที่ใกล้ที่สุดได้ที่สนามหลวง (ฟรี) หรือวัดมหาธาตุฯ (มีค่าใช้จ่าย)",
      },
    ],
    answerEn: [
      {
        p: "Parking inside the university is reserved for master's students and university staff only.",
      },
      {
        p: "Students in any year may bring a car onto campus from 16:30 onwards.",
      },
      {
        p: "The nearest parking for undergraduates is Sanam Luang (free) or Wat Mahathat (paid).",
      },
    ],
  },
  {
    slug: "why-contact-faculty-committee-first", // sourcePage: 31
    order: 3,
    category: "governance",
    question: {
      th: "เหตุใดจึงต้องติดต่อ กน. คณะตนเองก่อนที่จะส่งเรื่องมายัง อมธ.",
      en: "Why should I contact my own faculty committee before taking something to TUSU?",
    },
    answerTh: [
      { p: "หากเป็นการสอบถามเรื่องทั่วไป สามารถสอบถามกับ อมธ. ได้โดยตรง" },
      {
        p: "แต่หากเป็นเรื่องเกี่ยวกับเนื้อหารายวิชา เรื่องที่มีค่าใช้จ่าย หรือเรื่องเฉพาะของแต่ละคณะ ให้ติดต่อกับคณะของตนเอง เนื่องจากแต่ละคณะและสาขามีข้อจำกัดและเงื่อนไขทางหลักสูตรที่ต่างกัน",
      },
    ],
    answerEn: [
      { p: "For general questions you can ask TUSU directly." },
      {
        p: "For anything about course content, anything involving a fee, or anything specific to one faculty, contact your own faculty: each faculty and programme has its own limits and curriculum conditions.",
      },
    ],
  },
  {
    slug: "course-withdrawal-refund", // sourcePage: 31
    order: 4,
    category: "governance",
    question: {
      th: "หากทำเรื่องถอนรายวิชาแล้ว สามารถรับเงินคืนได้ที่ไหน",
      en: "If I withdraw from a course, where do I get the refund?",
    },
    answerTh: [{ p: "นักศึกษาจะได้รับเงินคืนผ่านบัญชีธนาคารกรุงเทพ" }],
    answerEn: [{ p: "The refund is paid into your Bangkok Bank account." }],
  },
  {
    slug: "tuition-deferral", // sourcePage: 31
    order: 5,
    category: "welfare",
    question: {
      th: "ผ่อนผันค่าเทอมได้ที่ไหน",
      en: "Where do I apply to defer my tuition fees?",
    },
    answerTh: [
      {
        p: "นักศึกษาต้องติดต่อคณะเพื่อยื่นคำร้องกับทางคณะ โดยจะพิจารณาเป็นรายบุคคล",
      },
    ],
    answerEn: [
      {
        p: "Apply to your faculty. Each request is considered individually.",
      },
    ],
  },
  {
    slug: "credit-exemption", // sourcePage: 31
    order: 6,
    category: "governance",
    question: {
      th: "Exempt ได้ที่ไหน",
      en: "Where do I apply for a credit exemption?",
    },
    answerTh: [
      {
        p: "ยื่นที่คณะที่นักศึกษาสังกัด โดยช่วงเวลาจะขึ้นอยู่กับแต่ละคณะ สามารถสอบถามกับทางคณะเพิ่มเติมได้",
      },
    ],
    answerEn: [
      {
        p: "Apply through the faculty you belong to. The application window differs by faculty, so ask your faculty for the dates.",
      },
    ],
  },
  {
    slug: "withdrawing-after-add-drop", // sourcePage: 31
    order: 7,
    category: "governance",
    question: {
      th: "ถอนรายวิชาหลังช่วงเพิ่มถอน จะส่งผลอะไรไหม",
      en: "What happens if I withdraw from a course after the add/drop period?",
    },
    answerTh: [
      {
        p: "ใน TU Greats จะขึ้น W ในรายวิชาที่ถอน ซึ่งไม่ส่งผลต่อผลการศึกษา แต่จะไม่สามารถขอเงินค่าธรรมเนียมคืนได้ทุกกรณี",
      },
    ],
    answerEn: [
      {
        p: "TU Greats shows a W against that course. It does not affect your academic result, but the fee cannot be refunded under any circumstances.",
      },
    ],
  },
  {
    slug: "lost-student-card", // sourcePage: 32
    order: 8,
    category: "welfare",
    question: {
      th: "ทำบัตรนักศึกษาหาย ต้องทำอย่างไร",
      en: "I lost my student card: what do I do?",
    },
    answerTh: [
      {
        p: "เบื้องต้นสามารถติดต่อ อมธ. ท่าพระจันทร์ ให้ประกาศ Lost & Found ได้",
      },
      {
        p: "หากหายแล้วไม่พบ ให้อายัดบัญชีผ่านแอปธนาคารกรุงเทพ และดำเนินการติดต่อที่ธนาคารกรุงเทพ (ฝั่งประตูท่าพระจันทร์)",
      },
    ],
    answerEn: [
      {
        p: "First, ask TUSU Tha Prachan to post it as Lost & Found.",
      },
      {
        p: "If it does not turn up, freeze the account through the Bangkok Bank app and then go to the Bangkok Bank branch by the Tha Prachan gate.",
      },
    ],
  },
  {
    slug: "essential-app", // sourcePage: 32
    order: 9,
    category: "welfare",
    question: {
      th: "แอปพลิเคชันที่นักศึกษา มธ. ต้องมี",
      en: "Which app does every TU student need?",
    },
    answerTh: [{ p: "TU Greats App" }],
    answerEn: [{ p: "TU Greats App." }],
  },
  {
    slug: "tu-virtual-clinic", // sourcePage: 32
    order: 10,
    category: "welfare",
    question: {
      th: "TU Virtual Clinic คืออะไร",
      en: "What is TU Virtual Clinic?",
    },
    answerTh: [
      {
        p: "TU Virtual Clinic คือห้องพยาบาล ตั้งอยู่บริเวณลานอนามัย ใต้ตึกกิจกรรม (ตรงข้ามโรงยิม)",
      },
      { p: "เปิดให้บริการวันจันทร์ - ศุกร์ เวลา 09.00 - 16.30 น." },
      {
        p: "เตรียมบัตรนักศึกษา บัตรประชาชน หรือพาสปอร์ต (สำหรับนักศึกษาต่างชาติ) ไปด้วย",
      },
    ],
    answerEn: [
      {
        p: "TU Virtual Clinic is the campus sick bay, on the health courtyard under the Student Activity Building, opposite the gym.",
      },
      { p: "Open Monday to Friday, 09:00 to 16:30." },
      {
        p: "Bring your student card and your ID card, or your passport if you are an international student.",
      },
    ],
  },
  {
    slug: "see-a-psychologist", // sourcePage: 32
    order: 11,
    category: "welfare",
    question: {
      th: "สามารถปรึกษานักจิตวิทยาได้ที่ไหน",
      en: "Where can I talk to a psychologist?",
    },
    answerTh: [
      { p: "จองคิวได้ที่ TU Greats App เลือกบริการ TU Well Being" },
      {
        p: "นัดพบได้ที่ ชั้น 3 ห้องกองกิจการนักศึกษา อาคารกิจกรรมนักศึกษา",
      },
      { p: "สายด่วนให้บริการ 24 ชั่วโมง โทร 02-026-2345 กด 2" },
    ],
    answerEn: [
      { p: "Book through the TU Greats App and choose the TU Well Being service." },
      {
        p: "Appointments are on the 3rd floor, Student Affairs Division office, Student Activity Building.",
      },
      { p: "The phone line runs 24 hours: call 02-026-2345 and press 2." },
    ],
  },
  {
    slug: "where-is-the-aed", // sourcePage: 32
    order: 12,
    category: "welfare",
    question: {
      th: "เครื่องกระตุกหัวใจไฟฟ้าอัตโนมัติ (AED) อยู่ที่ไหน",
      en: "Where is the defibrillator (AED)?",
    },
    answerTh: [{ p: "อยู่บริเวณหน้าหอประชุมศรีบูรพา" }],
    answerEn: [{ p: "In front of the Sri Burapha Auditorium." }],
  },
  {
    slug: "prayer-rooms", // sourcePage: 32
    order: 13,
    category: "welfare",
    question: { th: "ห้องละหมาดอยู่ที่ไหน", en: "Where are the prayer rooms?" },
    answerTh: [
      { p: "มีทั้งหมด 3 จุด" },
      { li: "หน้าโรงยิมเนเซียม" },
      { li: "คณะศิลปศาสตร์ ชั้น 6" },
      { li: "หอสมุดปรีดี พนมยงค์ ชั้น U1" },
    ],
    answerEn: [
      { p: "There are three." },
      { li: "In front of the gymnasium" },
      { li: "Faculty of Liberal Arts, 6th floor" },
      { li: "Pridi Banomyong Library, level U1" },
    ],
  },
  {
    slug: "gym-opening-hours", // sourcePage: 32
    order: 14,
    category: "welfare",
    question: {
      th: "ใช้บริการฟิตเนสได้วันเวลาไหนบ้าง",
      en: "When is the fitness centre open?",
    },
    answerTh: [
      { p: "ฟิตเนสเปิดให้บริการวันจันทร์ - ศุกร์ เวลา 14.00 - 20.00 น." },
    ],
    answerEn: [{ p: "Monday to Friday, 14:00 to 20:00." }],
  },
  {
    slug: "borrow-sports-equipment", // sourcePage: 32
    order: 15,
    category: "activity",
    question: {
      th: "ยืมอุปกรณ์กีฬาได้ที่ไหน",
      en: "Where can I borrow sports equipment?",
    },
    answerTh: [
      {
        p: "ยืมได้ที่คณะของตนเอง หรือห้อง อมธ. ท่าพระจันทร์ ตึกกิจกรรมนักศึกษา ชั้น 2 โดยนำบัตรนักศึกษามาด้วย",
      },
    ],
    answerEn: [
      {
        p: "From your own faculty, or from the TUSU Tha Prachan room on the 2nd floor of the Student Activity Building. Bring your student card.",
      },
    ],
  },
  {
    slug: "book-a-room-activity-building", // sourcePage: 32
    order: 16,
    category: "activity",
    question: {
      th: "หากต้องการใช้ห้องที่ตึกกิจกรรมนักศึกษาหรือโรงยิม ต้องทำอย่างไร",
      en: "How do I book a room in the Student Activity Building or the gym?",
    },
    answerTh: [
      {
        p: "จองห้องได้ที่ https://sa.tu.ac.th/oth/SATU_booking/MENU_booking/ พร้อมแนบไฟล์แบบฟอร์มขอความอนุเคราะห์",
      },
    ],
    answerEn: [
      {
        p: "Book at https://sa.tu.ac.th/oth/SATU_booking/MENU_booking/ and attach the completed request form.",
      },
    ],
  },
];

export const FAQ_DOCS: SeedDoc[] = FAQS.map((faq) => ({
  _id: docId("faq", faq.slug),
  _type: "faq",
  question: localeString(faq.question.th, faq.question.en),
  answer: localeBlock(faq.answerTh, faq.answerEn),
  category: faq.category,
  order: faq.order,
}));

/* ------------------------------------------------------------------ *
 * Welfare pages: handbook pages 13 to 19
 *
 * สวัสดิการนักศึกษา is the densest, most consequential part of the handbook:
 * insurance limits, coverage caps and mental health contacts. Figures are
 * carried across exactly as printed and are never rounded.
 * ------------------------------------------------------------------ */

type ContentPageSpec = {
  slug: string;
  order: number;
  category: "transport" | "welfare" | "activity" | "governance";
  title: Bilingual;
  summary: Bilingual;
  bodyTh: BlockSpec[];
  bodyEn: BlockSpec[];
  links?: Array<{ label: Bilingual; url: string; description?: Bilingual }>;
};

function externalLink(link: { label: Bilingual; url: string; description?: Bilingual }) {
  return {
    _type: "externalLink" as const,
    _key: key(),
    label: localeString(link.label.th, link.label.en),
    url: link.url,
    ...(link.description
      ? { description: localeString(link.description.th, link.description.en) }
      : {}),
    requiresSignIn: false,
  };
}

function contentPageDoc(type: "welfarePage" | "guidePage", page: ContentPageSpec): SeedDoc {
  return {
    _id: docId(type, page.slug),
    _type: type,
    title: localeString(page.title.th, page.title.en),
    slug: slug(page.slug),
    summary: localeText(page.summary.th, page.summary.en),
    body: localeBlock(page.bodyTh, page.bodyEn),
    category: page.category,
    ...(page.links ? { relatedLinks: page.links.map(externalLink) } : {}),
    order: page.order,
    // lastReviewed is deliberately omitted: see the note at the top of this file.
  };
}

const WELFARE_PAGES: ContentPageSpec[] = [
  {
    slug: "student-rights-elections-dress-and-titles", // sourcePage: 13
    order: 1,
    category: "governance",
    title: {
      th: "สิทธิการเลือกตั้ง การแต่งกาย และคำนำหน้านาม",
      en: "Voting rights, dress, and titles",
    },
    summary: {
      th: "สิทธิของนักศึกษาในการเลือกตั้งผู้แทนนักศึกษา และสิทธิเสรีภาพในการแต่งกายและการใช้คำนำหน้านามตามเพศวิถีของตน",
      en: "Which student representatives you get to elect, and your right to dress and to use a title according to your own gender identity.",
    },
    bodyTh: [
      { h: "สิทธิการเลือกตั้งของนักศึกษา มธ." },
      { li: "การเลือกตั้งสภานักศึกษาในระดับศูนย์" },
      {
        li: "การเลือกตั้งองค์การนักศึกษามหาวิทยาลัยธรรมศาสตร์ (อมธ.) ในระดับศูนย์และส่วนกลาง",
      },
      { li: "การเลือกตั้งกรรมการนักศึกษาประจำคณะ (กนศ.)" },
      { h: "สิทธิและเสรีภาพในการแต่งกายและการใช้คำนำหน้านาม" },
      {
        li: "นักศึกษาสามารถแต่งชุดไปรเวทได้ในโอกาสทั่วไป เช่น การเข้าชั้นเรียน การเข้าสอบ โดยไม่รบกวนสมาธิและสิทธิของผู้อื่น",
      },
      {
        li: "นักศึกษาสามารถแต่งกายด้วยเครื่องแบบนักศึกษาได้ตามเพศวิถีของตน ในโอกาสทั่วไป งานพิธี หรืองานเฉพาะของคณะ เพื่อเข้าชั้นเรียน เข้าสอบ เข้าฝึกปฏิบัติงาน หรือติดต่อหน่วยงานต่าง ๆ ในมหาวิทยาลัย",
      },
      {
        li: "นักศึกษาสามารถถ่ายรูปโดยการแต่งเครื่องแบบนักศึกษาได้ตามเพศวิถี",
      },
      {
        li: "บัณฑิตผู้เข้ารับพิธีพระราชทานปริญญาบัตรสามารถแต่งกายและจัดส่งรูปภาพที่แต่งชุดครุยได้ตามเพศวิถี",
      },
      {
        li: "ไม่มีการบังคับใช้คำนำหน้านามที่แสดงถึงเพศในทุกส่วนงานของนักศึกษา เว้นแต่มีกฎหมายกำหนดให้ต้องใช้ หรือบางกรณีที่จำเป็น เช่น การขึ้นทะเบียนนักศึกษาใหม่ แต่จะไม่มีการปรากฏคำนำหน้านามบนบัตรประจำตัวนักศึกษา",
      },
    ],
    bodyEn: [
      { h: "Elections you can vote in" },
      { li: "The Student Council election at campus level" },
      {
        li: "The Thammasat University Student Union (TUSU) election, at both campus and central level",
      },
      { li: "The faculty student committee election" },
      { h: "Dress and titles" },
      {
        li: "You may wear plain clothes on ordinary occasions, including in class and in exams, as long as it does not disturb other people's concentration or rights.",
      },
      {
        li: "You may wear the student uniform of your own gender identity on ordinary occasions, at ceremonies, and at faculty events: for class, exams, placements, or dealing with any university office.",
      },
      {
        li: "You may be photographed in the student uniform of your own gender identity.",
      },
      {
        li: "Graduands may dress, and submit their gown photograph, according to their own gender identity.",
      },
      {
        li: "No gendered title is imposed on students in any university process, except where the law requires one or where it is genuinely necessary, such as new student registration. No title appears on the student ID card.",
      },
    ],
  },
  {
    slug: "healthcare-rights", // sourcePage: 14
    order: 2,
    category: "welfare",
    title: { th: "สิทธิการรักษาพยาบาล", en: "Healthcare rights" },
    summary: {
      th: "วงเงินค่ารักษาพยาบาลที่โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ สิทธิทันตกรรมขั้นพื้นฐาน และสิทธิบัตรทองสำหรับนักศึกษา",
      en: "What Thammasat University Hospital covers, the basic dental allowance, and how the universal coverage (gold card) scheme works for students.",
    },
    bodyTh: [
      { h: "สิทธินักศึกษามหาวิทยาลัยธรรมศาสตร์" },
      {
        li: "สิทธิในการรักษาที่โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ วงเงิน 5,000 บาท/ครั้ง และ 20,000 บาท/ปีการศึกษา",
      },
      {
        li: "สิทธิทันตกรรมขั้นพื้นฐาน ได้แก่ ตรวจฟัน อุดฟัน ถอนฟัน ขูดหินปูน และ X-ray ฟันฟิล์มเล็ก ไม่เกิน 300 บาท/ครั้ง ใช้สิทธิได้ 3 ครั้ง/ปีการศึกษา",
      },
      {
        li: "ค่าตรวจทางห้องปฏิบัติการขั้นพื้นฐาน ได้แก่ CBC, Stool exam, Urine exam และ plain film X-ray",
      },
      { li: "ค่ายาตามบัญชียาหลัก ค่าห้อง และค่าอาหารสามัญ" },
      { h: "สิทธิบัตรประกันสุขภาพถ้วนหน้า (บัตรทอง)" },
      {
        p: "ใช้ได้เต็มสิทธิเฉพาะนักศึกษาที่ย้ายบัตรทองมาใช้สิทธิที่โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ",
      },
      { h3: "กรณีไม่ได้ย้ายสิทธิมาที่โรงพยาบาลธรรมศาสตร์ ยังใช้สิทธิต่อไปนี้ได้" },
      { li: "การตรวจ การวินิจฉัย การรักษา และการฟื้นฟูร่างกาย" },
      { li: "ค่าอาหารและค่าห้องสามัญ ในกรณีผู้ป่วยใน" },
      { li: "ค่ายาและเวชภัณฑ์ตามบัญชียาหลักแห่งชาติ" },
      { li: "ถอนฟัน อุดฟัน ขูดหินปูน ไม่จำกัดจำนวนครั้ง" },
      { li: "การทำฟันปลอมฐานพลาสติก" },
      {
        li: "กรณีเกิดอุบัติเหตุหรือเหตุฉุกเฉิน สามารถใช้โรงพยาบาลใกล้จุดเกิดเหตุได้ไม่จำกัด",
      },
      { li: "การส่งเสริมสุขภาพ การป้องกันและควบคุมโรค" },
    ],
    bodyEn: [
      { h: "Your rights as a Thammasat student" },
      {
        li: "Treatment at Thammasat University Hospital, covered up to 5,000 baht per visit and 20,000 baht per academic year",
      },
      {
        li: "Basic dental care: check-ups, fillings, extractions, scaling and small-film dental X-rays, up to 300 baht per visit, three visits per academic year",
      },
      {
        li: "Basic laboratory tests: CBC, stool exam, urine exam and plain film X-ray",
      },
      {
        li: "Medicines on the national essential medicines list, plus standard room and meal charges",
      },
      { h: "Universal coverage (gold card)" },
      {
        p: "The full benefit applies only if you have transferred your gold card registration to Thammasat University Hospital.",
      },
      { h3: "If you have not transferred it, you can still use" },
      { li: "Examination, diagnosis, treatment and rehabilitation" },
      { li: "Meals and a standard room as an inpatient" },
      { li: "Medicines and supplies on the national essential medicines list" },
      { li: "Extractions, fillings and scaling, with no limit on the number of visits" },
      { li: "Plastic-base dentures" },
      {
        li: "In an accident or emergency, any hospital near where it happened, with no limit",
      },
      { li: "Health promotion, disease prevention and disease control" },
    ],
  },
  {
    slug: "accident-insurance", // sourcePage: 15
    order: 3,
    category: "welfare",
    title: { th: "สิทธิประกันอุบัติเหตุนักศึกษา", en: "Student accident insurance" },
    summary: {
      th: "วิธีตรวจสอบสิทธิ โรงพยาบาลคู่สัญญาที่ไม่ต้องสำรองจ่าย และวงเงินความคุ้มครองของประกันอุบัติเหตุนักศึกษา มธ.",
      en: "How to check your cover, which hospitals let you claim without paying up front, and exactly what the policy pays out.",
    },
    bodyTh: [
      { h: "การตรวจสอบสิทธิ" },
      {
        p: "นักศึกษาสามารถตรวจสอบสิทธิประกันอุบัติเหตุได้ โดยแสดงบัตรประจำตัวประชาชนและบัตรประจำตัวนักศึกษาต่อเจ้าหน้าที่โรงพยาบาล",
      },
      { h: "การเบิกจ่าย" },
      {
        li: "หากมีชื่ออยู่ในกรมธรรม์และใช้โรงพยาบาลคู่สัญญา สามารถ Direct Claim ได้โดยไม่ต้องสำรองจ่าย",
      },
      { li: "หากไม่มีชื่อในกรมธรรม์ สามารถเพิ่มชื่อได้ภายหลัง" },
      {
        li: "หากมีชื่อในกรมธรรม์แต่ไม่ได้ใช้โรงพยาบาลคู่สัญญา ต้องสำรองจ่ายเอง แล้วนำเอกสารมายื่นที่เจ้าหน้าที่กองกิจการนักศึกษาประจำศูนย์ เพื่อนำส่งบริษัทประกัน",
      },
      { h: "โรงพยาบาลคู่สัญญา (ไม่ต้องสำรองจ่าย)" },
      { li: "ธรรมศาสตร์ท่าพระจันทร์: โรงพยาบาลเจ้าพระยาปิ่นเกล้า" },
      { li: "ศูนย์รังสิต: โรงพยาบาลธรรมศาสตร์เฉลิมพระเกียรติ" },
      { li: "ศูนย์ลำปาง: โรงพยาบาลขลางค์นคร-ราม" },
      { li: "ศูนย์พัทยา: โรงพยาบาลกรุงเทพพัทยา" },
      { h: "สิทธิประโยชน์ความคุ้มครอง" },
      {
        li: "ค่ารักษาพยาบาลกรณีอุบัติเหตุทั่วไป 15,000 บาท ต่ออุบัติเหตุ 1 ครั้ง ไม่รวมข้อยกเว้นกรมธรรม์",
      },
      {
        li: "กรณีเสียชีวิต เสียอวัยวะ สายตา การรับฟัง การพูดออกเสียง หรือทุพพลภาพถาวร จากอุบัติเหตุ การถูกทำร้ายร่างกาย หรือการถูกฆาตกรรม 150,000 บาท",
      },
      {
        li: "ค่าปลงศพและค่าใช้จ่ายในการจัดงานศพ กรณีเสียชีวิตจากการป่วยทั่วไป 15,000 บาท",
      },
    ],
    bodyEn: [
      { h: "Checking your cover" },
      {
        p: "Show your ID card and your student card to hospital staff and they can check whether you are on the policy.",
      },
      { h: "Making a claim" },
      {
        li: "If you are on the policy and you use a contracted hospital, you can claim directly and pay nothing up front.",
      },
      { li: "If you are not on the policy, you can be added to it later." },
      {
        li: "If you are on the policy but use a hospital that is not contracted, you pay first, then submit the paperwork to the Student Affairs Division at your campus, which forwards it to the insurer.",
      },
      { h: "Contracted hospitals (no payment up front)" },
      { li: "Thammasat Tha Prachan: Chao Phya Pinklao Hospital" },
      { li: "Rangsit: Thammasat University Hospital" },
      { li: "Lampang: Khelang Nakhon-Ram Hospital" },
      { li: "Pattaya: Bangkok Hospital Pattaya" },
      { h: "What the policy pays" },
      {
        li: "Medical treatment for an ordinary accident: 15,000 baht per accident, excluding the policy exclusions",
      },
      {
        li: "Death, or loss of a limb, sight, hearing or speech, or permanent disability, caused by an accident, assault or murder: 150,000 baht",
      },
      { li: "Funeral costs where death was from ordinary illness: 15,000 baht" },
    ],
  },
  {
    slug: "mental-health-services", // sourcePage: 16
    order: 4,
    category: "welfare",
    title: { th: "บริการสุขภาพจิตสำหรับนักศึกษา", en: "Mental health services" },
    summary: {
      th: "ช่องทางขอรับคำปรึกษาด้านสุขภาพจิต ทั้งแบบออนไลน์และแบบพบตัว พร้อมเวลาทำการและเบอร์ติดต่อ",
      en: "How to get counselling, online or in person, with the opening hours and the number to call if something goes wrong with your booking.",
    },
    bodyTh: [
      { h: "TU Well Being" },
      {
        p: "จองการใช้บริการได้ที่ TU Greats App เลือกบริการ TU Well Being",
      },
      { li: "รับบริการแบบออนไลน์ได้ทุกวันจันทร์ - ศุกร์" },
      { li: "รับบริการแบบพบตัว (onsite) ได้ทุกวันพุธ - ศุกร์ เวลา 08.00 - 16.00 น." },
      { h: "ศูนย์ Viva City" },
      {
        p: "บริการให้คำปรึกษาด้านสุขภาพ เปิดวันจันทร์ - ศุกร์ เวลา 08.30 - 16.30 น. (ในเวลาราชการ) จองผ่าน TU Greats App",
      },
      { h: "TCAPS" },
      {
        p: "ศูนย์บริการให้คำปรึกษา ตั้งอยู่ที่คณะศิลปศาสตร์ มหาวิทยาลัยธรรมศาสตร์ ทั้งธรรมศาสตร์ท่าพระจันทร์และศูนย์รังสิต",
      },
      { h: "บริการให้คำปรึกษาแบบออนไลน์" },
      {
        p: "ลงทะเบียนได้ที่ https://happy.relationflip.com/registerUniversity บริการนี้ไม่มีการรักษาด้วยยา",
      },
      {
        p: "หากสมัครแล้วยังไม่ได้รับอีเมลแจ้ง User และ Password หรือมีเหตุขัดข้องอื่น ๆ ติดต่อ RF Call Center 099-002-6888",
      },
    ],
    bodyEn: [
      { h: "TU Well Being" },
      { p: "Book through the TU Greats App and choose TU Well Being." },
      { li: "Online appointments, Monday to Friday" },
      { li: "In-person appointments, Wednesday to Friday, 08:00 to 16:00" },
      { h: "Viva City Centre" },
      {
        p: "Health counselling, Monday to Friday, 08:30 to 16:30 during office hours. Book through the TU Greats App.",
      },
      { h: "TCAPS" },
      {
        p: "A counselling centre at the Faculty of Liberal Arts, on both the Thammasat Tha Prachan and Rangsit campuses.",
      },
      { h: "Online counselling" },
      {
        p: "Register at https://happy.relationflip.com/registerUniversity. This service does not prescribe medication.",
      },
      {
        p: "If you have registered but not received the email with your username and password, or anything else goes wrong, call the RF Call Center on 099-002-6888.",
      },
    ],
    links: [
      {
        label: {
          th: "ลงทะเบียนบริการให้คำปรึกษาสุขภาพจิตออนไลน์",
          en: "Register for online mental health counselling",
        },
        url: "https://happy.relationflip.com/registerUniversity",
        description: {
          th: "บริการให้คำปรึกษาแบบออนไลน์ ไม่มีการรักษาด้วยยา",
          en: "Online counselling only, no medication is prescribed",
        },
      },
    ],
  },
  {
    slug: "library-welfare", // sourcePage: 17, 18
    order: 5,
    category: "welfare",
    title: { th: "สวัสดิการจากหอสมุด มธ.", en: "What the TU library gives you" },
    summary: {
      th: "สิทธิการยืมหนังสือ บริการวิชาการ การจองห้อง Study Room การยืมของใช้ และโควตาพรินต์ฟรีของนักศึกษา",
      en: "Borrowing limits, research services, booking a study room, borrowing equipment, and your free printing quota.",
    },
    bodyTh: [
      { h: "การยืมและบริการวิชาการ" },
      {
        li: "นักศึกษาระดับปริญญาตรียืมหนังสือได้สูงสุด 25 เล่ม ครั้งละ 30 วัน",
      },
      {
        li: "Book Delivery: บริการยืมหนังสือข้ามห้องสมุดสาขาต่าง ๆ ของมหาวิทยาลัยธรรมศาสตร์",
      },
      {
        li: "Full Text Finder: บริการค้นหาเอกสาร วารสาร หนังสืออิเล็กทรอนิกส์ และวิทยานิพนธ์",
      },
      {
        li: "Turnitin: บริการตรวจสอบการคัดลอกผลงานวิชาการทุกประเภท",
      },
      {
        li: "บริการตรวจบทคัดย่อภาษาอังกฤษ กรอกข้อมูลและอัปโหลดไฟล์ผ่านเว็บไซต์ U-Services ผู้เชี่ยวชาญจะตรวจแก้และส่งกลับทางอีเมลภายใน 3 วันทำการ สอบถามได้ที่ 02-613-3546 หรือ tuabstractediting@gmail.com",
      },
      {
        li: "บริการอื่น ๆ บนเว็บไซต์ U-Services เช่น Here to Help และบริการรูปภาพและไอคอนจาก Freepik และ Flaticon",
      },
      { h: "ห้อง Study Room และการยืมของใช้" },
      {
        li: "จองห้อง Study Room ผ่าน LINE Official ของหอสมุด @TULIBLifeOnline สำหรับอ่านหนังสือ ทำงาน ประชุม หรือดูหนัง โดยห้องดูหนังมีบริการ Netflix และ HBO Go ฟรี",
      },
      {
        li: "Library Of Things: ยืมของใช้ได้ เช่น Notebook, iPad, กล้อง, ปลั๊กพ่วงสายไฟ, ฮีตเตอร์, ถุงน้ำร้อน และบอร์ดเกม เพียงแสดงบัตรประจำตัวนักศึกษา ตัวจริงหรือใน TU Greats App",
      },
      { h: "โควตาพรินต์" },
      {
        li: "พรินต์ฟรี 100 บาท ต่อ 1 ภาคการศึกษา ใช้ได้ที่ชั้น U2 หอสมุดปรีดี พนมยงค์ และห้องคอมพิวเตอร์ชั้น 2 หอสมุดป๋วย อึ๊งภากรณ์",
      },
    ],
    bodyEn: [
      { h: "Borrowing and research services" },
      {
        li: "Undergraduates may borrow up to 25 books at a time, for 30 days",
      },
      {
        li: "Book Delivery: borrow from any Thammasat branch library and have it sent to you",
      },
      {
        li: "Full Text Finder: search documents, journals, e-books and theses",
      },
      { li: "Turnitin: plagiarism checking for any kind of academic work" },
      {
        li: "English abstract editing: submit through the U-Services website and a specialist returns the edited abstract by email within 3 working days. Questions: 02-613-3546 or tuabstractediting@gmail.com",
      },
      {
        li: "Other U-Services tools, including Here to Help, and images and icons from Freepik and Flaticon",
      },
      { h: "Study rooms and borrowing equipment" },
      {
        li: "Book a study room through the library's LINE Official account @TULIBLifeOnline, for reading, working, meetings or watching a film. The screening room has Netflix and HBO Go free.",
      },
      {
        li: "Library Of Things: borrow a notebook, iPad, camera, extension lead, heater, hot water bottle or a board game. Just show your student card, physical or in the TU Greats App.",
      },
      { h: "Printing quota" },
      {
        li: "100 baht of free printing per semester, on level U2 of Pridi Banomyong Library and in the 2nd floor computer room of Puey Ungphakorn Library",
      },
    ],
  },
  {
    slug: "sanitary-products-and-facilities", // sourcePage: 19
    order: 6,
    category: "welfare",
    title: {
      th: "ผ้าอนามัย ถุงยางอนามัย และสวัสดิการด้านกีฬาและความบันเทิง",
      en: "Sanitary products, condoms, sport and leisure",
    },
    summary: {
      th: "จุดรับผ้าอนามัยและถุงยางอนามัยฟรี พร้อมสถานที่และเวลาเปิดของฟิตเนส ห้องสันทนาการ และศูนย์บริการคอมพิวเตอร์",
      en: "Where to get free sanitary products and condoms, and the opening hours of the gym, the student lounge and the computer centre.",
    },
    bodyTh: [
      { h: "ผ้าอนามัยและถุงยางอนามัย" },
      {
        li: "ธรรมศาสตร์ท่าพระจันทร์: ขอผ้าอนามัยฟรีได้ที่แต่ละคณะ หรือที่ห้ององค์การนักศึกษา มหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ (อมธ.)",
      },
      {
        li: "ศูนย์รังสิต: ขอได้ที่ Thammasat Well Being Center และจุดแจกบริเวณห้องน้ำ หอสมุดป๋วย อึ๊งภากรณ์ และศูนย์การเรียนรู้กรมหลวงนราธิวาสราชนครินทร์ (ศกร.)",
      },
      {
        li: "ถุงยางอนามัย กดได้ที่ตู้ถุงยางอนามัย บริเวณชั้น 1 อาคารกิจกรรมนักศึกษา",
      },
      { h: "สวัสดิการด้านกีฬาและความบันเทิง ธรรมศาสตร์ท่าพระจันทร์" },
      {
        li: "ฟิตเนส ข้างอาคารยิมเนเซียม เปิดวันจันทร์ - ศุกร์ เวลา 14.00 - 20.00 น.",
      },
      {
        li: "ห้องสันทนาการนักศึกษา (Student lounge) ชั้น 3 อาคารกิจกรรมนักศึกษา เปิดวันจันทร์ - ศุกร์ เวลา 10.00 - 20.00 น.",
      },
      {
        li: "ศูนย์บริการคอมพิวเตอร์ ธรรมศาสตร์ท่าพระจันทร์ บริเวณ 1 และ 2 อาคารยิมเนเซียม เปิดวันจันทร์ - ศุกร์ เวลา 08.00 - 19.00 น.",
      },
    ],
    bodyEn: [
      { h: "Sanitary products and condoms" },
      {
        li: "Thammasat Tha Prachan: free sanitary products from any faculty, or from the TUSU Tha Prachan office",
      },
      {
        li: "Rangsit: from the Thammasat Well Being Center, and from the dispensing points by the toilets at Puey Ungphakorn Library and the Krom Luang Narathiwat Learning Centre",
      },
      {
        li: "Condoms are available from the dispenser on the 1st floor of the Student Activity Building",
      },
      { h: "Sport and leisure at Thammasat Tha Prachan" },
      {
        li: "Fitness centre, beside the gymnasium: Monday to Friday, 14:00 to 20:00",
      },
      {
        li: "Student lounge, 3rd floor of the Student Activity Building: Monday to Friday, 10:00 to 20:00",
      },
      {
        li: "Thammasat Tha Prachan Computer Service Center, areas 1 and 2 of the gymnasium: Monday to Friday, 08:00 to 19:00",
      },
    ],
  },
];

export const WELFARE_PAGE_DOCS = WELFARE_PAGES.map((page) => contentPageDoc("welfarePage", page));

/* ------------------------------------------------------------------ *
 * Guide pages: handbook pages 4, 5, 21, 22, 24, 25, 26, 27, 30
 * ------------------------------------------------------------------ */

const GUIDE_PAGES: ContentPageSpec[] = [
  {
    slug: "our-tpc", // sourcePage: 4
    order: 1,
    category: "activity",
    title: { th: "รู้จักธรรมศาสตร์ท่าพระจันทร์", en: "About Thammasat Tha Prachan" },
    summary: {
      th: "มหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ วิทยาเขตแรกของธรรมศาสตร์ ตั้งอยู่ตรงข้ามสนามหลวงและติดแม่น้ำเจ้าพระยา มี 10 คณะ 16 สาขา",
      en: "Thammasat's first campus, opposite Sanam Luang and on the Chao Phraya river, with 10 faculties and colleges and 16 programmes.",
    },
    bodyTh: [
      { p: "มธ. วิทยาเขตแรก" },
      {
        p: "ตั้งอยู่ในแขวงพระบรมมหาราชวัง ตรงข้ามกับสนามหลวง และติดกับแม่น้ำเจ้าพระยา ซึ่งเป็นแม่น้ำสายสำคัญของประเทศไทย",
      },
      { h: "10 คณะ 16 สาขา" },
      { li: "คณะนิติศาสตร์" },
      { li: "คณะพาณิชยศาสตร์และการบัญชี" },
      { li: "คณะรัฐศาสตร์" },
      { li: "คณะเศรษฐศาสตร์" },
      { li: "คณะสังคมสงเคราะห์ศาสตร์" },
      { li: "คณะศิลปศาสตร์" },
      { li: "คณะวารสารศาสตร์และสื่อสารมวลชน" },
      { li: "วิทยาลัยสหวิทยาการ" },
      { li: "วิทยาลัยนวัตกรรม" },
      { li: "วิทยาลัยนานาชาติปรีดี พนมยงค์" },
    ],
    bodyEn: [
      { p: "Thammasat's first campus." },
      {
        p: "It sits in Phra Borom Maha Ratchawang subdistrict, opposite Sanam Luang and on the bank of the Chao Phraya, Thailand's main river.",
      },
      { h: "10 faculties and colleges, 16 programmes" },
      { li: "Faculty of Law" },
      { li: "Faculty of Commerce and Accountancy" },
      { li: "Faculty of Political Science" },
      { li: "Faculty of Economics" },
      { li: "Faculty of Social Administration" },
      { li: "Faculty of Liberal Arts" },
      { li: "Faculty of Journalism and Mass Communication" },
      { li: "College of Interdisciplinary Studies" },
      { li: "College of Innovation" },
      { li: "Pridi Banomyong International College" },
    ],
  },
  {
    slug: "getting-to-tha-prachan", // sourcePage: 5
    order: 2,
    category: "transport",
    title: { th: "การเดินทางมาธรรมศาสตร์ท่าพระจันทร์", en: "Getting to Thammasat Tha Prachan" },
    summary: {
      th: "เส้นทางมายังมหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ ด้วยรถโดยสารประจำทาง เรือด่วนเจ้าพระยา เรือข้ามฟาก MRT และ BTS",
      en: "How to reach the Thammasat Tha Prachan campus by bus, Chao Phraya express boat, cross-river ferry, MRT and BTS.",
    },
    bodyTh: [
      { h: "รถโดยสารประจำทาง" },
      {
        p: "ลงป้ายสนามหลวงหรือป้ายท่าพระจันทร์ สาย 1, 3, 15, 19, 25, 30, 32, 53, 64, 80, 91, 123, 124, 189, 203, 208, ปอ.32 และ ปอ.524",
      },
      { h: "เรือด่วนเจ้าพระยา" },
      {
        p: "ลงที่ท่าพรานนก ต่อเรือข้ามฟากลงท่าวังหลัง แล้วเดินต่อมายัง มธ. ท่าพระจันทร์",
      },
      { h: "เรือข้ามฟาก" },
      {
        p: "นั่งรถมาลงโรงพยาบาลศิริราช - วังหลัง ขึ้นเรือที่ท่าวังหลัง ต่อเรือข้ามฟากมาลงที่ท่าพระจันทร์",
      },
      { h: "รถไฟฟ้าใต้ดิน (MRT)" },
      {
        p: "ลงสถานีสนามไชย ต่อรถเมล์สาย 32 หรือ 53 หรือเดินผ่านเกาะรัตนโกสินทร์มายัง มธ. ท่าพระจันทร์",
      },
      { h: "รถไฟฟ้า BTS" },
      {
        li: "ลงสถานีอนุสาวรีย์ชัยสมรภูมิ สายสุขุมวิท ต่อรถเมล์จากเกาะพญาไท มาลงที่ มธ. ท่าพระจันทร์",
      },
      {
        li: "ลงสถานีตากสิน สายสีลม ต่อเรือด่วนเจ้าพระยา มาลงท่าช้าง แล้วเดินต่อมายัง มธ. ท่าพระจันทร์",
      },
    ],
    bodyEn: [
      { h: "By bus" },
      {
        p: "Get off at the Sanam Luang or Tha Prachan stop. Routes 1, 3, 15, 19, 25, 30, 32, 53, 64, 80, 91, 123, 124, 189, 203, 208, and air-conditioned routes 32 and 524.",
      },
      { h: "By Chao Phraya express boat" },
      {
        p: "Get off at Phran Nok pier, take the cross-river ferry to Wang Lang pier, then walk to the campus.",
      },
      { h: "By cross-river ferry" },
      {
        p: "Travel to Siriraj Hospital / Wang Lang, board at Wang Lang pier and take the ferry across to Tha Prachan pier.",
      },
      { h: "By MRT" },
      {
        p: "Get off at Sanam Chai station, then take bus 32 or 53, or walk across Rattanakosin Island to the campus.",
      },
      { h: "By BTS" },
      {
        li: "Victory Monument on the Sukhumvit line, then a bus from the Phaya Thai island stop to Thammasat Tha Prachan",
      },
      {
        li: "Taksin on the Silom line, then the Chao Phraya express boat to Tha Chang pier and walk to the campus",
      },
    ],
  },
  {
    slug: "tha-prachan-to-rangsit", // sourcePage: 21, 22
    order: 3,
    category: "transport",
    title: { th: "เดินทางจากธรรมศาสตร์ท่าพระจันทร์ไปศูนย์รังสิต", en: "Thammasat Tha Prachan to Rangsit" },
    summary: {
      th: "สี่เส้นทางระหว่างธรรมศาสตร์ท่าพระจันทร์กับศูนย์รังสิต พร้อมค่าโดยสารและระยะเวลาเดินทางโดยประมาณตามที่วารสารระบุ",
      en: "Four ways to get between Thammasat Tha Prachan and the Rangsit campus, with the fares and approximate journey times printed in the handbook.",
    },
    bodyTh: [
      {
        p: "ระยะเวลาเดินทางทั้งหมดเป็นค่าโดยประมาณและขึ้นอยู่กับการจราจร",
      },
      { h: "รถเมล์ 1-9E ทางด่วน" },
      { li: "ต้นทางสนามหลวง ตรงข้าม มธ. ท่าพระจันทร์ ปลายทาง มธ. รังสิต" },
      { li: "ค่าโดยสาร 27 บาท" },
      { li: "ระยะเวลาเดินทางประมาณ 1 ชั่วโมง 30 นาที" },
      { h: "MRT ต่อรถตู้" },
      { li: "MRT สนามไชย ไป MRT สวนจตุจักร ค่าโดยสาร 45 บาท ใช้เวลา 30 นาที" },
      {
        li: "ออกทางออก 4 ต่อรถตู้ หมอชิต - มธ. รังสิต ค่าโดยสาร 45 บาท ใช้เวลาประมาณ 1 ชั่วโมง",
      },
      { h: "MRT ต่อรถไฟฟ้าสายสีแดง" },
      {
        li: "MRT สนามไชย ไป MRT บางซื่อ ค่าโดยสาร 45 บาท ใช้เวลาประมาณ 30 นาที แล้วเดินต่อประมาณ 5 นาที",
      },
      {
        li: "SRT กรุงเทพอภิวัฒน์ ไป SRT รังสิต ค่าโดยสารเริ่มต้น 20 บาท ใช้เวลาประมาณ 25 นาที",
      },
      { li: "เรียกรถต่อไปยัง มธ. รังสิต ใช้เวลาประมาณ 20 นาที" },
      { h: "รถเมล์ต่อรถตู้ หรือรถเมล์ตลอดสาย" },
      {
        li: "มธ. ท่าพระจันทร์ ไปอนุสาวรีย์ชัยสมรภูมิ โดยรถเมล์สาย 59 หรือ 503 สนามหลวง - รังสิต ค่าโดยสาร 25 บาท ใช้เวลาประมาณ 1 ชั่วโมง",
      },
      {
        li: "ต่อรถตู้ที่เกาะพญาไท อนุสาวรีย์ชัยฯ - มธ. รังสิต ค่าโดยสาร 47 บาท ใช้เวลาประมาณ 40 นาที",
      },
      {
        li: "หรือต่อรถเมล์ที่เกาะพหลโยธิน สาย 510 อนุสาวรีย์ชัยฯ - มธ. รังสิต ค่าโดยสาร 25 บาท ใช้เวลาประมาณ 1 ชั่วโมง 30 นาที",
      },
    ],
    bodyEn: [
      { p: "All journey times are approximate and depend on traffic." },
      { h: "Express bus 1-9E" },
      {
        li: "From Sanam Luang, opposite the Thammasat Tha Prachan campus, to TU Rangsit",
      },
      { li: "Fare 27 baht" },
      { li: "About 1 hour 30 minutes" },
      { h: "MRT then minivan" },
      {
        li: "Sanam Chai to Chatuchak Park, 45 baht, about 30 minutes",
      },
      {
        li: "Leave by exit 4 and take the Mo Chit – TU Rangsit minivan, 45 baht, about 1 hour",
      },
      { h: "MRT then the Red Line" },
      {
        li: "Sanam Chai to Bang Sue, 45 baht, about 30 minutes, then a walk of about 5 minutes",
      },
      {
        li: "Krung Thep Aphiwat to Rangsit on the Red Line, from 20 baht, about 25 minutes",
      },
      { li: "Then a taxi or ride-hail to TU Rangsit, about 20 minutes" },
      { h: "Bus then minivan, or bus all the way" },
      {
        li: "Thammasat Tha Prachan to Victory Monument on bus 59 or 503 (Sanam Luang – Rangsit), 25 baht, about 1 hour",
      },
      {
        li: "Then the Victory Monument – TU Rangsit minivan from the Phaya Thai island stop, 47 baht, about 40 minutes",
      },
      {
        li: "Or bus 510 from the Phahonyothin island stop, 25 baht, about 1 hour 30 minutes",
      },
    ],
  },
  {
    slug: "tu-get", // sourcePage: 24, 25
    order: 4,
    category: "governance",
    title: { th: "TU-GET", en: "TU-GET" },
    summary: {
      th: "ข้อสอบวัดระดับภาษาอังกฤษของธรรมศาสตร์ ทั้งแบบ PBT และ CBT พร้อมโครงสร้างคะแนน สนามสอบ ค่าสมัคร และกำหนดประกาศผล",
      en: "Thammasat's English proficiency test in both its paper-based and computer-based forms: scoring, venues, fees and when results come out.",
    },
    bodyTh: [
      { p: "TU-GET มี 2 รูปแบบ คือ TU-GET PBT ซึ่งสอบด้วยกระดาษคำตอบ และ TU-GET CBT ซึ่งสอบด้วยคอมพิวเตอร์" },
      { h: "TU-GET PBT" },
      {
        p: "ข้อสอบวัดระดับภาษาอังกฤษมาตรฐานสากลแบบเลือกตอบ 4 ตัวเลือก แบ่งเป็น 3 ส่วน คือ Grammar, Vocabulary และ Reading",
      },
      { li: "คะแนนเต็มรวม 1000 คะแนน" },
      { li: "Grammar 250 คะแนน" },
      { li: "Vocabulary 250 คะแนน" },
      { li: "Reading 500 คะแนน" },
      { li: "ค่าสมัครสอบ 800 บาท สมัครล่าช้า 1,000 บาท" },
      { li: "ประกาศคะแนนหลังสอบประมาณ 5-7 วัน" },
      { h3: "อาคารสอบของแต่ละศูนย์" },
      { li: "ธรรมศาสตร์ ท่าพระจันทร์: อาคารสถาบันภาษา" },
      { li: "ธรรมศาสตร์ ศูนย์รังสิต: อาคารเรียนรวม SC2" },
      { li: "ธรรมศาสตร์ ศูนย์ลำปาง: อาคารบุญชูปณิธาน" },
      { li: "ธรรมศาสตร์ ศูนย์พัทยา: อาคารศูนย์นวัตกรรมธรรมศาสตร์" },
      { h: "TU-GET CBT" },
      {
        p: "ข้อสอบวัดระดับภาษาอังกฤษมาตรฐานสากล ทดสอบทั้ง 4 ทักษะ ได้แก่ Reading, Listening, Speaking และ Writing",
      },
      { li: "คะแนนเต็มรวม 120 คะแนน พาร์ทละ 30 คะแนน" },
      {
        li: "สนามสอบ ธรรมศาสตร์ ศูนย์รังสิต ศูนย์ทดสอบสถาบันภาษา ชั้น 1 อาคาร SC1",
      },
      { li: "ค่าสมัครสอบ 1,500 บาท สมัครล่าช้า 1,800 บาท" },
      { li: "ประกาศคะแนนหลังสอบประมาณ 15 วัน" },
      { h: "ข้อควรรู้" },
      {
        p: "TU-GET สามารถเทียบเคียงกับ TOEFL (iBT) และ IELTS ได้ และสามารถยื่นขอยกเว้นหน่วยกิตวิชาเรียนได้",
      },
    ],
    bodyEn: [
      {
        p: "TU-GET comes in two forms: TU-GET PBT, taken on paper, and TU-GET CBT, taken on a computer.",
      },
      { h: "TU-GET PBT" },
      {
        p: "A standardised multiple-choice English test with four options per question, in three parts: Grammar, Vocabulary and Reading.",
      },
      { li: "1000 marks in total" },
      { li: "Grammar, 250 marks" },
      { li: "Vocabulary, 250 marks" },
      { li: "Reading, 500 marks" },
      { li: "Fee 800 baht, or 1,000 baht for a late application" },
      { li: "Results about 5 to 7 days after the exam" },
      { h3: "Exam buildings by campus" },
      { li: "Thammasat Tha Prachan: Language Institute building" },
      { li: "Rangsit: SC2 lecture building" },
      { li: "Lampang: Boonchoo Panithan building" },
      { li: "Pattaya: Thammasat Innovation Centre building" },
      { h: "TU-GET CBT" },
      {
        p: "A standardised English test covering all four skills: Reading, Listening, Speaking and Writing.",
      },
      { li: "120 marks in total, 30 marks per part" },
      {
        li: "Held at Rangsit only, in the Language Institute testing centre on the 1st floor of SC1",
      },
      { li: "Fee 1,500 baht, or 1,800 baht for a late application" },
      { li: "Results about 15 days after the exam" },
      { h: "Worth knowing" },
      {
        p: "TU-GET can be compared against TOEFL (iBT) and IELTS, and it can be used to apply for a credit exemption.",
      },
    ],
    links: [
      {
        label: {
          th: "สมัครสอบ TU-GET และดูรายละเอียดเพิ่มเติม",
          en: "Register for TU-GET and read the full details",
        },
        url: "https://litu.tu.ac.th/testing/tu-get/",
        description: {
          th: "เว็บไซต์สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์",
          en: "Thammasat Language Institute website",
        },
      },
    ],
  },
  {
    slug: "tu-library", // sourcePage: 26, 27
    order: 5,
    category: "welfare",
    title: { th: "หอสมุดธรรมศาสตร์", en: "TU Library" },
    summary: {
      th: "หอสมุดปรีดี พนมยงค์ และห้องสมุดคณะที่ธรรมศาสตร์ท่าพระจันทร์ พร้อมเวลาเปิดทำการและวิธีจองห้องผ่าน LINE",
      en: "Pridi Banomyong Library and the faculty libraries at Thammasat Tha Prachan, their opening hours, and how to book a room over LINE.",
    },
    bodyTh: [
      { h: "หอสมุดปรีดี พนมยงค์" },
      {
        p: "บ้านหลังที่สองของเด็กธรรมศาสตร์ท่าพระจันทร์ ช่วงใกล้สอบหรือหลังเลิกเรียนสามารถจองห้องเข้าไปใช้งานได้ ทั้ง Study room และ Co-learning space",
      },
      {
        p: "ที่นี่มีอุปกรณ์ครบ ทั้งปลั๊กไฟและที่ชาร์จแบต มีผ้าห่มให้ยืมเพราะแอร์เย็นมาก มีบอร์ดเกมให้เล่น และมีหนังสือหลายประเภททั้งภาษาไทยและภาษาอังกฤษให้ยืมได้ หากหาไม่เจอหรือต้องการความช่วยเหลือ สามารถสอบถามเจ้าหน้าที่ได้",
      },
      { li: "มีห้อง Performative room สำหรับจัดกิจกรรม" },
      { li: "มี AI TOOLs Services ตรวจการคัดลอกเนื้อหาและ AI ฟรี" },
      { li: "เปิดบริการทุกวัน เวลา 08.30 - 21.30 น. ยกเว้นวันหยุดนักขัตฤกษ์" },
      { h: "ห้องสมุดคณะ" },
      {
        li: "ห้องสมุดสัญญา ธรรมศักดิ์ ชั้น 1-3 คณะนิติศาสตร์ เปิดวันจันทร์ - ศุกร์ 08.30 - 21.30 น. วันเสาร์ 09.00 - 19.00 น. ปิดวันอาทิตย์และวันหยุดนักขัตฤกษ์",
      },
      {
        li: "ห้องสมุด ศ.ดิเรก ชัยนาม ชั้น 5 คณะรัฐศาสตร์ เปิดวันจันทร์ - ศุกร์ 08.30 - 19.00 น. ปิดวันเสาร์ วันอาทิตย์ และวันหยุดนักขัตฤกษ์",
      },
      {
        li: "ห้องสมุดป๋วย อึ๊งภากรณ์ ชั้น 3 คณะเศรษฐศาสตร์ เปิดวันจันทร์ - เสาร์ 08.00 - 16.00 น. ปิดวันอาทิตย์และวันหยุดนักขัตฤกษ์",
      },
      {
        li: "ห้องสมุด ศ.สังเวียน อินทรวิชัย ชั้น 4 คณะพาณิชยศาสตร์และการบัญชี เปิดวันจันทร์ - ศุกร์ 08.00 - 20.00 น. วันเสาร์ - อาทิตย์ 08.30 - 18.00 น. ปิดวันหยุดนักขัตฤกษ์",
      },
      {
        li: "ห้องสมุดคณะวารสารศาสตร์และสื่อสารมวลชน เปิดวันจันทร์ - ศุกร์ 08.00 - 16.00 น. วันเสาร์ - อาทิตย์ 09.00 - 17.00 น. ปิดวันหยุดนักขัตฤกษ์",
      },
      { h: "วิธีจองห้องผ่าน LINE" },
      { ol: "เพิ่มเพื่อน LINE @Lifeonline หรือสแกน QR Code" },
      { ol: "เลือกเมนู Booking แล้วเลือกจองห้อง" },
      { ol: "เลือกห้องและช่วงเวลาที่ต้องการ แล้วกรอกรหัสร่วมจอง" },
      { ol: "ยืนยันการจองผ่าน LINE" },
    ],
    bodyEn: [
      { h: "Pridi Banomyong Library" },
      {
        p: "The second home of Thammasat Tha Prachan students. Around exams, or after class, you can book a study room or use the co-learning space.",
      },
      {
        p: "It has everything you need: power sockets and chargers, blankets to borrow because the air conditioning is fierce, board games, and books in Thai and English to take out. If you cannot find something or need help, ask the staff.",
      },
      { li: "There is a Performative room for running events" },
      { li: "AI Tools Services check for copied content and AI writing, free" },
      {
        li: "Open every day, 08:30 to 21:30, except public holidays",
      },
      { h: "Faculty libraries" },
      {
        li: "Sanya Dharmasakti Library, floors 1-3, Faculty of Law: Monday to Friday 08:30 to 21:30, Saturday 09:00 to 19:00, closed Sunday and public holidays",
      },
      {
        li: "Prof. Direk Jayanama Library, 5th floor, Faculty of Political Science: Monday to Friday 08:30 to 19:00, closed at weekends and on public holidays",
      },
      {
        li: "Puey Ungphakorn Library, 3rd floor, Faculty of Economics: Monday to Saturday 08:00 to 16:00, closed Sunday and public holidays",
      },
      {
        li: "Prof. Sangwian Indaravijaya Library, 4th floor, Faculty of Commerce and Accountancy: Monday to Friday 08:00 to 20:00, weekends 08:30 to 18:00, closed on public holidays",
      },
      {
        li: "Faculty of Journalism and Mass Communication Library: Monday to Friday 08:00 to 16:00, weekends 09:00 to 17:00, closed on public holidays",
      },
      { h: "Booking a room over LINE" },
      { ol: "Add the LINE account @Lifeonline as a friend, or scan the QR code" },
      { ol: "Choose the Booking menu, then choose to book a room" },
      { ol: "Pick the room and the time slot, then enter the co-booking code" },
      { ol: "Confirm the booking in LINE" },
    ],
    links: [
      {
        label: {
          th: "U-Services หอสมุดมหาวิทยาลัยธรรมศาสตร์",
          en: "Thammasat University Library U-Services",
        },
        url: "https://uservice.library.tu.ac.th/u-services/",
        description: {
          th: "ทำวิจัย ตรวจแก้ไขบทคัดย่อ และสืบค้นข่าวต่างประเทศ",
          en: "Research support, abstract editing and international news search",
        },
      },
    ],
  },
  {
    slug: "student-discounts", // sourcePage: 30
    order: 6,
    category: "welfare",
    title: { th: "สิทธิพิเศษสำหรับเด็กธรรมศาสตร์ท่าพระจันทร์", en: "Discounts for TPC students" },
    summary: {
      th: "ส่วนลดและสิทธิพิเศษที่ได้เมื่อแสดงบัตรนักศึกษา ทั้งร้านหนังสือ ร้านอาหารและคาเฟ่ ห้องสมุด และพิพิธภัณฑ์รอบธรรมศาสตร์ท่าพระจันทร์",
      en: "What your student card gets you: the bookshop, cafes and restaurants, the library, and the museums around Thammasat Tha Prachan.",
    },
    bodyTh: [
      { h: "ศูนย์หนังสือธรรมศาสตร์" },
      { li: "ซื้อครบ 100 บาท ลด 10%" },
      { h: "ร้านอาหารและคาเฟ่" },
      { li: "Amazon ที่คณะนิติศาสตร์: นักศึกษาและบุคลากร ลด 10%" },
      { li: "ร้านครัวม่วน ตรอกพระจันทร์กลาง: นักศึกษา ลด 10%" },
      { li: "LUA café: ลด 10% เมื่อแสดงบัตรนักศึกษา" },
      { li: "ช่างคั่ว สาขาธรรมศาสตร์ท่าพระจันทร์: ลด 10% เมื่อแสดงบัตรนักศึกษา" },
      {
        li: "ร้านอาหารเธียเตอร์ริเวอร์ไซด์: ลดค่าอาหารและเครื่องดื่ม 10% เมื่อแสดงบัตรนักศึกษา ไม่จำกัดจำนวนครั้ง และไม่รวมกับโปรโมชั่นอื่น",
      },
      {
        li: "KRAFT CAFE: ลดค่าอาหารและเครื่องดื่ม 50 บาท เมื่อแสดงบัตรนักศึกษา ไม่จำกัดจำนวนครั้ง และไม่รวมกับโปรโมชั่นอื่น",
      },
      { h: "หอสมุดปรีดี พนมยงค์ ชั้น U2" },
      { li: "พรินต์ฟรี 100 บาท ต่อ 1 ภาคการศึกษา" },
      { li: "AI TOOLs Services ตรวจการคัดลอกเนื้อหาและ AI ฟรี" },
      { h: "พิพิธภัณฑ์" },
      { li: "พิพิธภัณฑสถานแห่งชาติ พระนคร: เข้าฟรีเมื่อแสดงบัตรนักศึกษา" },
      { li: "พิพิธภัณฑสถานแห่งชาติ หอศิลป์: เข้าฟรีเมื่อแสดงบัตรนักศึกษา" },
      { li: "นิทรรศน์รัตนโกสินทร์: เข้าฟรีเมื่อแสดงบัตรนักศึกษา" },
      { li: "ท่าพิพิธภัณฑ์ Museum pier: ลด 50% เมื่อแสดงบัตรนักศึกษา" },
      { li: "ตึกถาวรวัตถุ (ตึกแดง)" },
      { li: "หอศิลป์ ณ บ้านเจ้าพระยา" },
      { li: "พิพิธภัณฑ์และห้องสมุดเจ้าอาวาส วัดบวรนิเวศวิหาร" },
      { li: "พิพิธภัณฑ์สุนทรภู่ วัดเทพธิดาราม" },
      { li: "พิพิธภัณฑ์ปืนใหญ่โบราณ กระทรวงกลาโหม" },
    ],
    bodyEn: [
      { h: "Thammasat University Book Centre" },
      { li: "10% off when you spend 100 baht or more" },
      { h: "Food and cafes" },
      { li: "Amazon at the Faculty of Law: 10% off for students and staff" },
      { li: "Khrua Muan, Trok Phra Chan Klang: 10% off for students" },
      { li: "LUA café: 10% off on showing your student card" },
      { li: "Chang Khua, Thammasat Tha Prachan branch: 10% off on showing your student card" },
      {
        li: "Theatre Riverside restaurant: 10% off food and drink on showing your student card, no limit on how often, not combinable with other promotions",
      },
      {
        li: "KRAFT CAFE: 50 baht off food and drink on showing your student card, no limit on how often, not combinable with other promotions",
      },
      { h: "Pridi Banomyong Library, level U2" },
      { li: "100 baht of free printing per semester" },
      { li: "AI Tools Services for plagiarism and AI checking, free" },
      { h: "Museums" },
      { li: "Bangkok National Museum: free entry with your student card" },
      { li: "The National Gallery: free entry with your student card" },
      { li: "Nitasrattanakosin: free entry with your student card" },
      { li: "Museum Pier: 50% off with your student card" },
      { li: "Thawornwatthu Building (the Red Building)" },
      { li: "Ban Chao Phraya Art Gallery" },
      { li: "The abbot's museum and library, Wat Bowonniwet Vihara" },
      { li: "Sunthorn Phu Museum, Wat Thepthidaram" },
      { li: "Ancient Cannon Museum, Ministry of Defence" },
    ],
  },
];

export const GUIDE_PAGE_DOCS = GUIDE_PAGES.map((page) => contentPageDoc("guidePage", page));

/* ------------------------------------------------------------------ *
 * Places: handbook pages 19, 26, 28, 29, 32
 *
 * Only places the handbook actually gives a location or opening hours for.
 * `lat`/`lng` are left off everywhere: the handbook prints no coordinates and
 * the place schema is explicit that a coordinate should only be added if it
 * has really been checked.
 * ------------------------------------------------------------------ */

type PlaceSpec = {
  slug: string;
  category: "transport" | "welfare" | "activity" | "governance";
  name: Bilingual;
  building?: Bilingual;
  description?: Bilingual;
  openingHours?: ReturnType<typeof hours>[];
  isKeyLocation?: boolean;
};

const PLACES: PlaceSpec[] = [
  /* --- Libraries, handbook page 26 --- */
  {
    slug: "pridi-banomyong-library",
    category: "welfare",
    name: { th: "หอสมุดปรีดี พนมยงค์", en: "Pridi Banomyong Library" },
    description: {
      th: "หอสมุดกลางของธรรมศาสตร์ท่าพระจันทร์ มีห้อง Study room ห้อง Co-learning space ห้อง Performative room ปลั๊กไฟ ผ้าห่มให้ยืม บอร์ดเกม และโควตาพรินต์ฟรีที่ชั้น U2",
      en: "The main Thammasat Tha Prachan library: study rooms, a co-learning space, a performative room, power sockets, blankets to borrow, board games, and the free printing quota on level U2.",
    },
    openingHours: [hours(EVERY_DAY, "08:30", "21:30", CLOSED_PUBLIC_HOLIDAYS)],
    isKeyLocation: true,
  },
  {
    slug: "sanya-dharmasakti-library",
    category: "welfare",
    name: { th: "ห้องสมุดสัญญา ธรรมศักดิ์", en: "Sanya Dharmasakti Library" },
    building: { th: "ชั้น 1-3 คณะนิติศาสตร์", en: "Floors 1-3, Faculty of Law" },
    openingHours: [
      hours(MON_FRI, "08:30", "21:30"),
      hours([6], "09:00", "19:00", {
        th: "ปิดวันอาทิตย์และวันหยุดนักขัตฤกษ์",
        en: "Closed Sunday and on public holidays",
      }),
    ],
  },
  {
    slug: "direk-jayanama-library",
    category: "welfare",
    name: { th: "ห้องสมุด ศ.ดิเรก ชัยนาม", en: "Prof. Direk Jayanama Library" },
    building: {
      th: "ชั้น 5 คณะรัฐศาสตร์",
      en: "5th floor, Faculty of Political Science",
    },
    openingHours: [
      hours(MON_FRI, "08:30", "19:00", {
        th: "ปิดวันเสาร์ วันอาทิตย์ และวันหยุดนักขัตฤกษ์",
        en: "Closed at weekends and on public holidays",
      }),
    ],
  },
  {
    slug: "puey-ungphakorn-library-tha-prachan",
    category: "welfare",
    name: { th: "ห้องสมุดป๋วย อึ๊งภากรณ์", en: "Puey Ungphakorn Library" },
    building: {
      th: "ชั้น 3 คณะเศรษฐศาสตร์",
      en: "3rd floor, Faculty of Economics",
    },
    openingHours: [
      hours(MON_SAT, "08:00", "16:00", {
        th: "ปิดวันอาทิตย์และวันหยุดนักขัตฤกษ์",
        en: "Closed Sunday and on public holidays",
      }),
    ],
  },
  {
    slug: "sangwian-indaravijaya-library",
    category: "welfare",
    name: {
      th: "ห้องสมุด ศ.สังเวียน อินทรวิชัย",
      en: "Prof. Sangwian Indaravijaya Library",
    },
    building: {
      th: "ชั้น 4 คณะพาณิชยศาสตร์และการบัญชี",
      en: "4th floor, Faculty of Commerce and Accountancy",
    },
    openingHours: [
      hours(MON_FRI, "08:00", "20:00"),
      hours(WEEKEND, "08:30", "18:00", CLOSED_PUBLIC_HOLIDAYS),
    ],
  },
  {
    slug: "journalism-library",
    category: "welfare",
    name: {
      th: "ห้องสมุดคณะวารสารศาสตร์และสื่อสารมวลชน",
      en: "Faculty of Journalism and Mass Communication Library",
    },
    openingHours: [
      hours(MON_FRI, "08:00", "16:00"),
      hours(WEEKEND, "09:00", "17:00", CLOSED_PUBLIC_HOLIDAYS),
    ],
  },

  /* --- Health, handbook page 32 --- */
  {
    slug: "tu-virtual-clinic",
    category: "welfare",
    name: { th: "TU Virtual Clinic", en: "TU Virtual Clinic" },
    building: {
      th: "ลานอนามัย ใต้อาคารกิจกรรมนักศึกษา ตรงข้ามโรงยิม",
      en: "Health courtyard, under the Student Activity Building, opposite the gym",
    },
    description: {
      th: "ห้องพยาบาลของธรรมศาสตร์ท่าพระจันทร์ เตรียมบัตรนักศึกษา บัตรประชาชน หรือพาสปอร์ตสำหรับนักศึกษาต่างชาติไปด้วย",
      en: "The Thammasat Tha Prachan sick bay. Bring your student card and ID card, or your passport if you are an international student.",
    },
    openingHours: [hours(MON_FRI, "09:00", "16:30")],
    isKeyLocation: true,
  },

  /* --- Sport and leisure, handbook page 19 --- */
  {
    slug: "tha-prachan-fitness",
    category: "activity",
    name: { th: "ฟิตเนส ธรรมศาสตร์ท่าพระจันทร์", en: "Thammasat Tha Prachan fitness centre" },
    building: { th: "ข้างอาคารยิมเนเซียม", en: "Beside the gymnasium" },
    openingHours: [hours(MON_FRI, "14:00", "20:00")],
  },
  {
    slug: "student-lounge",
    category: "activity",
    name: { th: "ห้องสันทนาการนักศึกษา", en: "Student lounge" },
    building: {
      th: "ชั้น 3 อาคารกิจกรรมนักศึกษา",
      en: "3rd floor, Student Activity Building",
    },
    openingHours: [hours(MON_FRI, "10:00", "20:00")],
  },
  {
    slug: "tha-prachan-computer-service-center",
    category: "activity",
    name: {
      th: "ศูนย์บริการคอมพิวเตอร์ ธรรมศาสตร์ท่าพระจันทร์",
      en: "Thammasat Tha Prachan Computer Service Center",
    },
    building: {
      th: "บริเวณ 1 และ 2 อาคารยิมเนเซียม",
      en: "Areas 1 and 2, gymnasium building",
    },
    openingHours: [hours(MON_FRI, "08:00", "19:00")],
  },

  /* --- Food, handbook pages 28 and 29.
   * The handbook prints no address or opening hours for these, only what to
   * order and roughly what it costs, so that is all that is recorded. The
   * student discounts are on the student-discounts guide page, not repeated
   * here, so there is one place for an editor to update them. --- */
  {
    slug: "new-yong-hua",
    category: "activity",
    name: { th: "นิวย่งฮั้ว", en: "New Yong Hua" },
    description: {
      th: "ร้านบะหมี่และข้าวหน้าเป็ด แนะนำบะหมี่เป็ดและบะหมี่หมูแดง ราคา 50-100 บาท",
      en: "Noodles and duck rice. The handbook recommends the duck noodles and the red pork noodles, 50-100 baht.",
    },
  },
  {
    slug: "mala-na-mor",
    category: "activity",
    name: { th: "หม่าล่าหน้ามอ", en: "Mala Na Mor" },
    description: {
      th: "ร้านหม่าล่าปิ้งย่าง มีน้ำจิ้มหลายแบบทั้งหม่าล่าและซีฟู้ด ปรับความเผ็ดได้ แนะนำเต้าหู้ปลาและเบค่อนพันไส้กรอก เริ่มต้น 10 บาทต่อไม้",
      en: "Mala skewers with a choice of dipping sauces, mala or seafood, and adjustable heat. The handbook recommends the fish tofu and the bacon-wrapped sausage, from 10 baht a skewer.",
    },
  },
  {
    slug: "pa-pom-tokyo",
    category: "activity",
    name: { th: "ป้าป้อมขนมโตเกียว", en: "Pa Pom Tokyo Snacks" },
    description: {
      th: "ร้านขนมโตเกียว มีไส้ให้เลือกทั้งคาวและหวาน แนะนำไส้ปลาชีสและช็อกโกแลต ราคา 10-20 บาทต่อชิ้น",
      en: "Tokyo-style rolled snacks with both savoury and sweet fillings. The handbook recommends the fish and cheese and the chocolate, 10-20 baht each.",
    },
  },
  {
    slug: "saep-am-lam",
    category: "activity",
    name: { th: "ร้านอาหารอีสาน แซ่บอำหลำ", en: "Saep Am Lam Isan restaurant" },
    description: {
      th: "ร้านอาหารอีสาน เลือกระดับความเผ็ดได้ แนะนำตำหลวงพระบางและปีกกลางทอด ราคา 20-300 บาท",
      en: "Isan food with a choice of heat level. The handbook recommends the Luang Prabang papaya salad and the fried mid-joint wings, 20-300 baht.",
    },
  },
  {
    slug: "fruit-juice-shop",
    category: "activity",
    name: { th: "ร้านน้ำผลไม้", en: "The fruit juice shop" },
    description: {
      th: "ร้านน้ำผลไม้ปั่น เลือกความหวานได้ แนะนำแตงโมปั่น เริ่มต้น 25-30 บาท",
      en: "Fresh fruit smoothies with adjustable sweetness. The handbook recommends the watermelon smoothie, from 25-30 baht.",
    },
  },
  {
    slug: "lua-cafe",
    category: "activity",
    name: { th: "LUA Café", en: "LUA Café" },
    description: {
      th: "คาเฟ่ ชงสดแก้วต่อแก้ว เลือกความหวานได้ แนะนำมัทฉะสตรอว์เบอร์รี เริ่มต้น 100 บาท ลด 10% เมื่อแสดงบัตรนักศึกษา",
      en: "A cafe making every cup to order, with adjustable sweetness. The handbook recommends the strawberry matcha, from 100 baht. 10% off with a student card.",
    },
  },
  {
    slug: "chang-khua-tha-prachan",
    category: "activity",
    name: { th: "ช่างคั่ว สาขาธรรมศาสตร์ท่าพระจันทร์", en: "Chang Khua, Thammasat Tha Prachan" },
    description: {
      th: "ร้านกาแฟคั่วสด บรรยากาศโฮมมี่ แนะนำ Caramel Macchiato และ Earl grey peach pinkvine เริ่มต้น 90 บาท ลด 10% เมื่อแสดงบัตรนักศึกษา",
      en: "Freshly roasted coffee in a homely setting. The handbook recommends the caramel macchiato and the earl grey peach pinkvine, from 90 baht. 10% off with a student card.",
    },
  },
];

export const PLACE_DOCS: SeedDoc[] = PLACES.map((place) => ({
  _id: docId("place", place.slug),
  _type: "place",
  name: localeString(place.name.th, place.name.en),
  slug: slug(place.slug),
  ...(place.building ? { building: localeString(place.building.th, place.building.en) } : {}),
  ...(place.description
    ? { description: localeText(place.description.th, place.description.en) }
    : {}),
  category: place.category,
  ...(place.openingHours ? { openingHours: place.openingHours } : {}),
  isKeyLocation: place.isKeyLocation ?? false,
}));

/* ------------------------------------------------------------------ *
 * Organisations the dataset did not have: handbook pages 9, 10 and 12
 * ------------------------------------------------------------------ */

type OrgSpec = {
  id: string;
  type: "facultyCommittee" | "club" | "independentGroup";
  name: Bilingual;
  slug: string;
  faculty?: Bilingual;
  description?: Bilingual;
  contacts: ReturnType<typeof contact>[];
};

const NEW_ORGANISATIONS: OrgSpec[] = [
  {
    // sourcePage: 9. The only one of the 17 faculty bodies on that page with
    // no organisation document in this dataset.
    id: docId("organisation", "kstu-official"),
    type: "facultyCommittee",
    slug: "ks-student-association",
    name: {
      th: "สโมสรนักศึกษาสาขาเกาหลีศึกษา",
      en: "Korean Studies Student Association",
    },
    faculty: { th: "สาขาเกาหลีศึกษา", en: "Korean Studies programme" },
    contacts: [contact("instagram", "kstu.official")],
  },
  {
    // sourcePage: 10
    id: docId("organisation", "tu-englishdebate"),
    type: "club",
    slug: "english-debate-club",
    name: {
      th: "ชุมนุมปาฐกถาภาษาอังกฤษ มหาวิทยาลัยธรรมศาสตร์",
      en: "Thammasat English Debate Club",
    },
    description: {
      th: "ชุมนุมที่พูดถึงปัญหาที่เกิดขึ้นในโลกปัจจุบัน และเปิดพื้นที่ให้นักศึกษาได้แลกเปลี่ยนความคิดเห็นผ่านการใช้ทักษะภาษาอังกฤษ",
      en: "A club that debates current world issues and gives students a space to exchange views in English.",
    },
    contacts: [contact("instagram", "tu.englishdebate")],
  },
  {
    // sourcePage: 12
    id: docId("organisation", "tudocumentary"),
    type: "independentGroup",
    slug: "tu-documentary",
    name: {
      th: "กลุ่มอิสระสารคดีศึกษาแห่งมหาวิทยาลัยธรรมศาสตร์",
      en: "TU Documentary",
    },
    description: {
      th: "กลุ่มอิสระที่จัดทำสารคดีในรูปแบบของภาพถ่าย วิดีโอ และบทความ เพราะสิ่งเหล่านี้บอกเล่าความเป็นมาและเรื่องราวได้ดีที่สุด",
      en: "An independent group making documentaries as photography, video and writing, on the view that those tell a story best.",
    },
    contacts: [contact("instagram", "tudocumentary")],
  },
  {
    // sourcePage: 12
    id: docId("organisation", "tutpc-fc"),
    type: "independentGroup",
    slug: "tutpc-fc",
    name: {
      th: "กลุ่มอิสระฟุตบอลและฟุตซอลนานาชาติแห่งมหาวิทยาลัยธรรมศาสตร์",
      en: "TUTPC.FC",
    },
    description: {
      th: "กลุ่มอิสระสำหรับชาวธรรมศาสตร์ท่าพระจันทร์ที่สนใจกีฬาฟุตบอลและฟุตซอล ได้มีโอกาสมาเล่นกีฬาร่วมกัน",
      en: "An independent group for Thammasat Tha Prachan students who play football and futsal, and want people to play with.",
    },
    contacts: [contact("instagram", "tutpc.fc")],
  },
];

export const NEW_ORGANISATION_DOCS: SeedDoc[] = NEW_ORGANISATIONS.map((org) => ({
  _id: org.id,
  _type: "organisation",
  name: localeString(org.name.th, org.name.en),
  slug: slug(org.slug),
  type: org.type,
  ...(org.faculty ? { faculty: localeString(org.faculty.th, org.faculty.en) } : {}),
  ...(org.description
    ? { description: localeText(org.description.th, org.description.en) }
    : {}),
  contacts: org.contacts,
  isActive: true,
}));

/* ------------------------------------------------------------------ *
 * Enrichment of organisations that already exist
 *
 * seed.ts wrote most of these with the organisation's English display name
 * copied into BOTH name.th and name.en, because only one name had been
 * captured (see the long comment above ORGANISATIONS in seed.ts). The
 * handbook prints the real Thai names, and descriptions for the clubs.
 *
 * These are applied as PATCHES, not createOrReplace, and only to name.th,
 * name.en and description. A patch is skipped entirely if a human has since
 * given the document a genuine Thai name, so this can never overwrite
 * editorial work.
 * ------------------------------------------------------------------ */

type Enrichment = {
  id: string;
  sourcePage: number;
  name: Bilingual;
  description?: Bilingual;
};

export const ENRICHMENTS: Enrichment[] = [
  /* Faculty committees, handbook page 9. The handbook prints the full formal
   * Thai name of each body; the existing documents carry only a short English
   * label. Both are kept: the Thai name from the handbook, the English label
   * already in the dataset. */
  {
    id: "organisation-llbthammasat_sc",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการนักศึกษา หลักสูตรนิติศาสตรบัณฑิต สาขาวิชากฎหมายธุรกิจ (หลักสูตรนานาชาติ)",
      en: "LL.B. Student Committee",
    },
  },
  {
    id: "organisation-spdstudentc",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการนักศึกษา คณะสังคมสงเคราะห์ศาสตร์ ท่าพระจันทร์",
      en: "SPD Inter Student Council",
    },
  },
  {
    id: "organisation-basictpc",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการนักศึกษา คณะศิลปศาสตร์ ส่วนงานท่าพระจันทร์",
      en: "Liberal Arts Student Council Tha Prachan",
    },
  },
  {
    id: "organisation-citu_sc",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการนักศึกษา วิทยาลัยนวัตกรรม",
      en: "CITU Student Committee",
    },
  },
  {
    id: "organisation-pbic-sctu",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการนักศึกษา วิทยาลัยนานาชาติปรีดี พนมยงค์",
      en: "PBIC Student Committee",
    },
  },
  {
    id: "organisation-thaprachanppe",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการนักศึกษา วิทยาลัยสหวิทยาการ ท่าพระจันทร์",
      en: "CISTU TPC Student Committee",
    },
  },
  {
    id: "organisation-student_birsa",
    sourcePage: 9,
    name: {
      th: "สโมสรนักศึกษาสาขาการเมืองการระหว่างประเทศ",
      en: "BIR Student Association",
    },
  },
  {
    id: "organisation-seasthammasat",
    sourcePage: 9,
    name: {
      th: "สโมสรนักศึกษาโครงการเอเชียตะวันออกเฉียงใต้ศึกษา",
      en: "SEAS Thammasat",
    },
  },
  {
    id: "organisation-res-tu-official",
    sourcePage: 9,
    name: {
      th: "สโมสรนักศึกษาสาขารัสเซียและยูเรเซียศึกษา",
      en: "RES TU",
    },
  },
  {
    id: "organisation-btithammasat",
    sourcePage: 9,
    name: {
      th: "สโมสรนักศึกษาสาขาการแปลและล่ามในยุคดิจิทัล",
      en: "BTi Student Association",
    },
  },
  {
    id: "organisation-bctu-committee",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการแกนรุ่น สาขาการสื่อสารเชิงธุรกิจ หลักสูตรนานาชาติ",
      en: "Business Communication Committee of Thammasat University",
    },
  },
  {
    id: "organisation-basthammasat",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการแกนรุ่น สาขาอังกฤษ - อเมริกันศึกษา หลักสูตรนานาชาติ",
      en: "British and American Studies",
    },
  },
  {
    id: "organisation-bjm-tpc",
    sourcePage: 9,
    name: {
      th: "คณะกรรมการนักศึกษา สาขาวารสารศาสตร์และสื่อสารมวลชน หลักสูตรนานาชาติ",
      en: "BJM TPC Student Council",
    },
  },
  {
    id: "organisation-ibmp-studentpage",
    sourcePage: 9,
    name: {
      th: "ประธานนักศึกษาคณะพาณิชยศาสตร์และการบัญชี หลักสูตรตรีควบโท",
      en: "IBMP TU",
    },
  },
  {
    id: "organisation-bba-thammasat",
    sourcePage: 9,
    name: {
      th: "ประธานนักศึกษาคณะพาณิชยศาสตร์และการบัญชี หลักสูตรนานาชาติ",
      en: "BBA TU",
    },
  },
  {
    id: "organisation-scobe-thammasat",
    sourcePage: 9,
    name: {
      th: "คณะอนุกรรมการนักศึกษา คณะเศรษฐศาสตร์ หลักสูตรนานาชาติ",
      en: "BE Student Council",
    },
  },

  /* Clubs and independent groups, handbook pages 10 to 12. These gain a real
   * Thai name AND the club's own description of itself. */
  {
    id: "organisation-tpcbasket",
    sourcePage: 10,
    name: {
      th: "ชุมนุม TPC Allstar มหาวิทยาลัยธรรมศาสตร์",
      en: "TPC Allstar",
    },
    description: {
      th: "ชุมนุมกีฬาบาสเกตบอลและวอลเลย์บอลสำหรับชาวธรรมศาสตร์ท่าพระจันทร์ที่ชอบเล่นกีฬา เปิดโอกาสให้นักศึกษามาเล่นกีฬาด้วยกัน เพื่อสร้างเสริมสุขภาพและความสัมพันธ์ระหว่างนักศึกษา",
      en: "A basketball and volleyball club for Thammasat Tha Prachan students, giving people somewhere to play together, for their health and to get to know each other.",
    },
  },
  {
    id: "organisation-firebrick-tpcdance",
    sourcePage: 11,
    name: { th: "ชุมนุม TPC DANCE", en: "TPC Dance" },
    description: {
      th: "ชุมนุมเกี่ยวกับการเต้น เป็นพื้นที่สำหรับชาวธรรมศาสตร์ท่าพระจันทร์ที่ชื่นชอบในการเต้น",
      en: "A dance club, and a space for Thammasat Tha Prachan students who love to dance.",
    },
  },
  {
    id: "organisation-tpc-music",
    sourcePage: 11,
    name: { th: "ชุมนุม TPC Music", en: "TPC Music" },
    description: {
      th: "ชุมนุมเกี่ยวกับดนตรี เปิดพื้นที่ให้นักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ ที่รักในเสียงดนตรีได้มีส่วนร่วม",
      en: "A music club, open to any Thammasat Tha Prachan student who loves music.",
    },
  },
  {
    id: "organisation-tuhost_official",
    sourcePage: 11,
    name: { th: "ชุมนุมสื่อสร้างสรรค์", en: "TUHost" },
    description: {
      th: "ชุมนุมเกี่ยวกับการเป็นพิธีกร รวมไปถึงการสร้างสื่อสร้างสรรค์ในมหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์",
      en: "A club for hosting and compering, and for making creative media at Thammasat Tha Prachan.",
    },
  },
  {
    id: "organisation-asa-tpc",
    sourcePage: 11,
    name: {
      th: "ชุมนุมอาสาท่าพระจันทร์ : เพื่อประชาชน",
      en: "ASA TPC: For the People",
    },
    description: {
      th: "ชุมนุมที่ออกค่ายอาสาตามพื้นที่ต่าง ๆ เพื่อช่วยเหลือผู้ที่อยู่ห่างไกลความเจริญ ทั้งการสอนหนังสือและการสร้างสิ่งอำนวยความสะดวกให้แก่คนในพื้นที่",
      en: "A volunteering club that runs camps in remote areas, teaching and building facilities for the people living there.",
    },
  },
  {
    id: "organisation-tpc-filmclub",
    sourcePage: 12,
    name: {
      th: "กลุ่มอิสระภาพยนตร์และการถ่ายภาพเคลื่อนไหวแห่งมหาวิทยาลัยธรรมศาสตร์",
      en: "TPC Film Club",
    },
    description: {
      th: "กลุ่มอิสระสำหรับผู้ที่รักและสนใจในภาพยนตร์ มาทำกิจกรรมรับชมภาพยนตร์และวิเคราะห์เชิงวิจารณ์ร่วมกัน รวมถึงการผลิตสื่อและถ่ายทำภาพเคลื่อนไหว",
      en: "An independent group for people who love film: watching together, discussing them critically, and making and shooting their own.",
    },
  },
];

/**
 * The handbook also prints extra Instagram accounts for two organisations
 * that the dataset records only one channel for. These are NOT applied
 * automatically: `contacts` is a curated array and appending to it blindly
 * could duplicate a channel an editor has already fixed. They are reported at
 * the end of the run instead.
 */
export const EXTRA_CONTACTS_TO_REVIEW = [
  {
    id: "organisation-tpcbasket",
    note: "handbook p.10 lists a second Instagram for the volleyball side of TPC Allstar: tpcvolleyball",
  },
  {
    id: "organisation-asa-tpc",
    note: "handbook p.11 lists a second Instagram for the rainy-season camp: intercamp_tu (asa.tpc is the winter camp)",
  },
];