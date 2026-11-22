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
function hours(daysOfWeek: number[], opens: string, closes: string, note?: Bilingual, range?: { from: string; until: string }) {
  return {
    _type: "openingHours" as const,
    _key: key(),
    daysOfWeek,
    opens,
    closes,
    ...(note ? { note: localeString(note.th, note.en) } : {}),
    ...(range ? { validFrom: range.from, validUntil: range.until } : {}),
  };
}

const MON_FRI = [1, 2, 3, 4, 5];
const MON_SAT = [1, 2, 3, 4, 5, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKEND = [0, 6];
const SAT = [6];

/** Exam period hours, TU Library notice for November 2026. */
const EXAM_PRIDI_LATE = { from: "2026-11-16", until: "2026-11-22" };
const EXAM_PRIDI_EVENING = { from: "2026-11-23", until: "2026-11-30" };
const EXAM_SANGWIAN_WEEK_1 = { from: "2026-11-16", until: "2026-11-20" };
const EXAM_SANGWIAN_WEEK_2 = { from: "2026-11-23", until: "2026-11-27" };
const EXAM_PUEY = { from: "2026-11-18", until: "2026-12-04" };

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
    openingHours: [
      hours(EVERY_DAY, "08:30", "21:30", CLOSED_PUBLIC_HOLIDAYS),
      hours(EVERY_DAY, "08:30", "06:00", { th: "ช่วงสอบ ปิด 06.00 น. ของวันถัดไป", en: "Exam hours, closes 06:00 the following day" }, EXAM_PRIDI_LATE),
      hours(EVERY_DAY, "08:30", "23:00", { th: "ช่วงสอบ", en: "Exam hours" }, EXAM_PRIDI_EVENING),
    ],
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
      hours(MON_FRI, "08:00", "19:00", {
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
      hours(MON_FRI, "08:00", "18:00", { th: "ช่วงสอบ", en: "Exam hours" }, EXAM_PUEY),
      hours(SAT, "08:00", "16:00", { th: "ช่วงสอบ", en: "Exam hours" }, EXAM_PUEY),
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
      hours(MON_FRI, "08:00", "21:00", { th: "ช่วงสอบ", en: "Exam hours" }, EXAM_SANGWIAN_WEEK_1),
      hours(MON_FRI, "08:00", "21:00", { th: "ช่วงสอบ", en: "Exam hours" }, EXAM_SANGWIAN_WEEK_2),
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
      hours(SAT, "09:00", "17:00", {
        th: "ปิดวันอาทิตย์และวันหยุดนักขัตฤกษ์",
        en: "Closed Sunday and on public holidays",
      }),
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