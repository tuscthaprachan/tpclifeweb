import type { LocaleString } from "../config";

/**
 * Staff console strings for /admin/performance. The published figures reuse the
 * public page's `perf` strings (lib/i18n/strings.ts) so the two read the same.
 */
export const PERFORMANCE_STRINGS = {
  pfLink: { th: "ผลการดำเนินงาน", en: "Performance" },
  pfTitle: { th: "ผลการดำเนินงาน", en: "Performance" },
  pfIntro: {
    th: "ตัวเลขที่เผยแพร่ต่อสาธารณะ และตัวเลขการทำงานประจำวันสำหรับหัวหน้าหน่วยและผู้ดูแลระบบ",
    en: "The figures published to the public, and the day to day counts for unit leads and administrators",
  },
  pfDashIntro: { th: "ดูตัวเลขที่เผยแพร่ เรื่องที่ค้างอยู่ และเรื่องที่เกินกำหนด", en: "See the published figures, what is open and what is overdue" },
  pfPublicLink: { th: "ดูหน้าที่เผยแพร่ต่อสาธารณะ", en: "See the public page" },
  pfOpsHeading: { th: "การทำงานตอนนี้", en: "Right now" },
  pfOpsIntro: {
    th: "นับสดจากระบบ ไม่ซ่อนตัวเลขที่น้อย ข้อร้องเรียนในหมวดที่จำกัดการเข้าถึงนับให้เฉพาะเจ้าหน้าที่ที่ได้รับมอบหมายในหมวดนั้น ดังนั้นตัวเลขของคุณอาจต่างจากของคนอื่น",
    en: "Counted live from the system, with no hiding of small numbers. Complaints in restricted categories are counted only for staff named on that category, so your numbers may differ from someone else's",
  },
  pfOpenHeading: { th: "เรื่องที่ยังเปิดอยู่ตามสถานะ", en: "Open cases by status" },
  pfOpenCaption: { th: "เรื่องที่ยังไม่ปิด แยกตามบริการและสถานะ", en: "Cases that are not closed, by service and status" },
  pfColService: { th: "บริการ", en: "Service" },
  pfColType: { th: "ประเภท", en: "Type" },
  pfColStatus: { th: "สถานะ", en: "Status" },
  pfColOpen: { th: "เรื่อง", en: "Cases" },
  pfNoneOpen: { th: "ไม่มีเรื่องที่เปิดอยู่", en: "There are no open cases" },
  pfOverdueHeading: { th: "ข้อร้องเรียนที่เกินกำหนด", en: "Overdue complaints" },
  pfOverdueIntro: {
    th: "นับเฉพาะข้อร้องเรียนที่ยังเปิดอยู่ เรื่องของหายและของที่พบไม่มีกำหนดเวลา",
    en: "Open complaints only. Lost and found has no target dates",
  },
  pfComplaintsOpen: { th: "ข้อร้องเรียนที่เปิดอยู่", en: "Open complaints" },
  pfAckOverdue: { th: "เกินกำหนดรับทราบ", en: "Past the acknowledge date" },
  pfAckOverdueDef: { th: "ยังไม่มีผู้รับทราบและเลยกำหนดรับทราบแล้ว", en: "Not yet acknowledged and past the acknowledge date" },
  pfResolveOverdue: { th: "เกินกำหนดแก้ไข", en: "Past the resolve date" },
  pfResolveOverdueDef: { th: "ยังไม่แก้ไขและเลยกำหนดแก้ไขแล้ว", en: "Not yet resolved and past the resolve date" },
  pfOverdueAny: { th: "เกินกำหนดอย่างใดอย่างหนึ่ง", en: "Overdue either way" },
  pfEscalated: { th: "ส่งต่อหัวหน้าหน่วยแล้ว", en: "Escalated" },
  pfEscalatedDef: { th: "งานประจำวันทำเครื่องหมายไว้เมื่อเลยกำหนด และยังไม่ปิดเรื่อง", en: "Flagged by the daily job when a target was missed, and not yet closed" },
  pfDesksHeading: { th: "เรื่องของแต่ละห้องบริการ", en: "Cases by desk" },
  pfDesksCaption: { th: "เรื่องที่ยังเปิดอยู่ แยกตามห้องบริการของ อมธ. และ สภานักศึกษา", en: "Open cases by TUSU and TUSC desk" },
  pfColDesk: { th: "ห้องบริการ", en: "Desk" },
  pfColHeld: { th: "ของที่ถืออยู่ (ของหายและของที่พบ)", en: "Held (lost and found)" },
  pfColHandled: { th: "ดำเนินการล่าสุดโดยห้องนี้", en: "Last handled by this desk" },
  pfNoDesk: { th: "ยังไม่ระบุห้อง", en: "No desk yet" },
  pfDesksNote: {
    th: "“ที่ถืออยู่” คือเรื่องของหายและของที่พบที่ห้องนั้นเก็บของไว้ “ดำเนินการล่าสุด” คือเรื่องทุกบริการที่เจ้าหน้าที่ของห้องนั้นดำเนินการล่าสุด ข้อร้องเรียนใช้คิวร่วมกันจึงไม่มีห้องที่ถือเรื่อง",
    en: "“Held” is lost and found cases whose item is at that desk. “Last handled” is cases of any service whose latest action was by that desk's staff. Complaints share one queue, so no desk holds them",
  },
  pfFiguresHeading: { th: "ตัวเลขที่เผยแพร่", en: "Published figures" },
  pfFiguresIntro: {
    th: "ตัวเลขชุดเดียวกับหน้าสาธารณะ และใช้กฎซ่อนตัวเลขที่น้อยกว่า 5 เรื่องเช่นกัน",
    en: "The same figures as the public page, with the same rule hiding anything based on fewer than 5 cases",
  },
  pfUnavailable: { th: "คำนวณตัวเลขไม่สำเร็จ ลองอีกครั้ง", en: "We could not work out the figures. Try again" },
} as const satisfies Record<string, LocaleString>;
