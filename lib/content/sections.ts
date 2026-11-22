import { BookOpen, Compass, HeartPulse, LifeBuoy, Megaphone, Sun, Wallet, type LucideIcon } from "lucide-react";
import { CONTENT_SECTIONS, type ContentSection } from "@/lib/db/schema/content/enums";
import type { LocaleString } from "@/lib/i18n/config";

export { CONTENT_SECTIONS, type ContentSection };

/**
 * The site is organised by what a student is trying to do, not by who
 * provides it. Each section is a life event. A section's hub lists, in one
 * order, the topic pages stored in that section (their `order`) and the
 * entries below (`order` here), which point at tools and pages that already
 * exist elsewhere. See docs/needs-rebuild-plan.md.
 */
export interface SectionEntry {
  path: string;
  label: LocaleString;
  description: LocaleString;
  order: number;
}

export interface SectionDef {
  key: ContentSection;
  path: string;
  icon: LucideIcon;
  /** Short, for the menu and breadcrumbs. */
  label: LocaleString;
  /** One line under the hub's title: who it is for and what they can do. */
  intro: LocaleString;
  entries: SectionEntry[];
}

const e = (path: string, order: number, en: [string, string], th: [string, string]): SectionEntry => ({
  path,
  order,
  label: { en: en[0], th: th[0] },
  description: { en: en[1], th: th[1] },
});

export const SECTIONS: Record<ContentSection, SectionDef> = {
  start: {
    key: "start",
    path: "/start",
    icon: Compass,
    label: { en: "Starting at Tha Prachan", th: "เริ่มต้นที่ท่าพระจันทร์" },
    intro: {
      en: "New to Tha Prachan? How to get here, find your way, get online and know what you are entitled to.",
      th: "เพิ่งมาท่าพระจันทร์ ดูวิธีเดินทาง หาอาคาร ใช้อินเทอร์เน็ต และสิทธิที่นักศึกษาได้รับ",
    },
    entries: [
      e("/places", 20, ["Find a building or room", "Where things are on campus, and when they are open"], ["หาอาคารหรือห้อง", "สถานที่ในมหาวิทยาลัยและเวลาเปิด"]),
      e("/directory", 50, ["Find your faculty office", "Phone numbers and emails for faculty and university offices"], ["ติดต่อสำนักงานคณะ", "เบอร์โทรและอีเมลของคณะและหน่วยงาน"]),
      e("/faq", 70, ["Common questions", "Parking, prayer rooms and other quick answers"], ["คำถามที่พบบ่อย", "ที่จอดรถ ห้องละหมาด และคำตอบสั้น ๆ อื่น ๆ"]),
    ],
  },
  campus: {
    key: "campus",
    path: "/campus",
    icon: Sun,
    label: { en: "Day to day", th: "ชีวิตประจำวัน" },
    intro: {
      en: "What is open, when the next shuttle leaves, where to eat, and how to book a space or use the gym.",
      th: "ที่ไหนเปิดอยู่ รถรับส่งคันถัดไป กินอะไรดี และวิธีจองสถานที่หรือใช้ฟิตเนส",
    },
    entries: [
      e("/places", 10, ["Is it open now?", "Opening hours for the library, gym, clinic and more"], ["เปิดอยู่ไหม", "เวลาเปิดของห้องสมุด ฟิตเนส คลินิก และที่อื่น ๆ"]),
      e("/getting-around/shuttle", 20, ["Next shuttle", "Scheduled times for the free shuttles"], ["รถรับส่งคันถัดไป", "เวลาตามตารางของรถรับส่งฟรี"]),
      e("/eat", 30, ["What to eat", "Canteen stalls with prices"], ["กินอะไรดี", "ร้านในโรงอาหาร พร้อมราคา"]),
      e("/alerts", 60, ["Closures and disruptions", "Service alerts for Tha Prachan"], ["ประกาศปิดและเหตุขัดข้อง", "ประกาศแจ้งเตือนของท่าพระจันทร์"]),
      e("/events", 90, ["What's on", "Events and activities on campus"], ["กิจกรรม", "กิจกรรมในมหาวิทยาลัย"]),
      e("/weather", 100, ["Weather", "Rain and heat at Tha Prachan today"], ["สภาพอากาศ", "ฝนและความร้อนที่ท่าพระจันทร์วันนี้"]),
    ],
  },
  study: {
    key: "study",
    path: "/study",
    icon: BookOpen,
    label: { en: "Study and exams", th: "เรียนและสอบ" },
    intro: {
      en: "Book a study room, use the libraries, print and check your work, and sit TU-GET.",
      th: "จองห้องอ่านหนังสือ ใช้ห้องสมุด พิมพ์งานและตรวจงาน และสอบ TU-GET",
    },
    entries: [e("/forms", 70, ["Find a form", "University and student body forms"], ["ค้นหาแบบฟอร์ม", "แบบฟอร์มของมหาวิทยาลัยและองค์กรนักศึกษา"])],
  },
  health: {
    key: "health",
    path: "/health",
    icon: HeartPulse,
    label: { en: "Health and support", th: "สุขภาพและการดูแล" },
    intro: {
      en: "Ill, injured or struggling? Where to go, what you will pay, and who to talk to.",
      th: "เจ็บป่วย ได้รับบาดเจ็บ หรือไม่สบายใจ ไปที่ไหน เสียค่าใช้จ่ายเท่าไร และคุยกับใครได้",
    },
    entries: [],
  },
  money: {
    key: "money",
    path: "/money",
    icon: Wallet,
    label: { en: "Money", th: "การเงิน" },
    intro: {
      en: "Grants if you are in difficulty, and ways to spend less while you study.",
      th: "ทุนช่วยเหลือเมื่อประสบปัญหา และวิธีประหยัดค่าใช้จ่ายระหว่างเรียน",
    },
    entries: [
      e("/about/open-data/tusc/funds", 20, ["University funds", "The regulations for student funds, including the Fund for Students in Financial Need"], ["กองทุนของมหาวิทยาลัย", "ข้อบังคับกองทุน รวมถึงกองทุนช่วยเหลือนักศึกษาที่มีความจำเป็นทางการเงิน"]),
      e("/campus/discounts", 30, ["Discounts", "What your student card gets you off"], ["ส่วนลด", "ส่วนลดเมื่อแสดงบัตรนักศึกษา"]),
      e("/study/tu-get", 40, ["TU-GET fees", "What the English test costs for your student ID year"], ["ค่าสอบ TU-GET", "ค่าสอบตามรหัสนักศึกษา"]),
      e("/start/what-your-student-card-gets-you", 50, ["Free for students", "Everything your student card gets you for free"], ["ฟรีสำหรับนักศึกษา", "สิ่งที่นักศึกษาใช้ได้ฟรี"]),
    ],
  },
  help: {
    key: "help",
    path: "/help",
    icon: LifeBuoy,
    label: { en: "Get help", th: "แจ้งเรื่องและขอความช่วยเหลือ" },
    intro: {
      en: "Something gone wrong? Report a problem, find lost property, borrow kit or reach the right office.",
      th: "มีปัญหา แจ้งเรื่อง ตามหาของหาย ยืมอุปกรณ์ หรือติดต่อหน่วยงานที่เกี่ยวข้อง",
    },
    entries: [
      e("/complaints", 10, ["Report a problem", "With a course, your faculty or the university. You get a reference and a reply"], ["แจ้งปัญหา", "เรื่องรายวิชา คณะ หรือมหาวิทยาลัย ได้เลขอ้างอิงและคำตอบ"]),
      e("/lost-and-found", 20, ["Lost or found something", "See what has been handed in, or report an item"], ["ของหายหรือเก็บของได้", "ดูของที่มีผู้นำมาส่ง หรือแจ้งรายการ"]),
      e("/report", 30, ["Other ways to report", "Broken facilities, safety and wellbeing lines"], ["ช่องทางแจ้งเรื่องอื่น ๆ", "สิ่งอำนวยความสะดวกชำรุด ความปลอดภัย และสายด่วนดูแลใจ"]),
      e("/borrow", 40, ["Borrow equipment", "Sports kit, radios and first aid kits for activities"], ["ยืมอุปกรณ์", "อุปกรณ์กีฬา วิทยุสื่อสาร ชุดปฐมพยาบาล"]),
      e("/directory", 50, ["Find a contact", "Phone numbers and emails for campus offices"], ["ติดต่อหน่วยงาน", "เบอร์โทรและอีเมลของหน่วยงานในท่าพระจันทร์"]),
    ],
  },
  say: {
    key: "say",
    path: "/have-your-say",
    icon: Megaphone,
    label: { en: "Have your say", th: "ส่งเสียงของคุณ" },
    intro: {
      en: "Who represents you, how to vote, whether promises are kept, and how student money is spent.",
      th: "ใครเป็นตัวแทนของคุณ วิธีเลือกตั้ง ความคืบหน้าของนโยบาย และการใช้งบประมาณของนักศึกษา",
    },
    entries: [
      e("/policy", 20, ["Policy progress", "Whether the Union is keeping its promises"], ["ความคืบหน้านโยบาย", "องค์การนักศึกษาทำตามนโยบายหรือไม่"]),
      e("/about/open-data", 40, ["Open data", "Meetings, budgets, funds and reports"], ["ข้อมูลเปิด", "การประชุม งบประมาณ กองทุน และรายงาน"]),
      e("/news", 50, ["News", "Announcements from the student bodies"], ["ข่าว", "ประกาศจากองค์กรนักศึกษา"]),
    ],
  },
};

export const SECTION_LIST: SectionDef[] = CONTENT_SECTIONS.map((key) => SECTIONS[key]);

export function topicPath(section: ContentSection, slug: string): string {
  return `${SECTIONS[section].path}/${slug}`;
}
