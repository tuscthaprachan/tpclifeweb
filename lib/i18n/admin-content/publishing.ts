import type { LocaleString } from "../config";

/**
 * Staff console strings for service alerts, events and policies. Spread into
 * `A` in lib/i18n/admin.ts. Keys are prefixed by content type.
 */
export const PUBLISHING_STRINGS = {
  /* Service alerts */
  alertsGroupMessage: { th: "ข้อความประกาศ", en: "The message" },
  alertsGroupWhen: { th: "ช่วงเวลาที่แสดง", en: "When it shows" },
  alertsGroupWhere: { th: "ระดับและที่ที่แสดง", en: "How serious, and where it shows" },
  alertsFieldBody: { th: "รายละเอียด", en: "Details" },
  alertsHintBody: {
    th: "บอกสิ่งที่เกิดขึ้นและสิ่งที่ผู้อ่านควรทำ ใช้ข้อความธรรมดา ไม่ควรยาว",
    en: "Say what has happened and what readers should do. Plain text, kept short",
  },
  alertsFieldSeverity: { th: "ระดับความสำคัญ", en: "How serious it is" },
  alertsSeverityInfo: { th: "ข้อมูลทั่วไป", en: "For information" },
  alertsSeverityWarning: { th: "คำเตือน", en: "Warning" },
  alertsSeverityCritical: { th: "เร่งด่วน", en: "Urgent" },
  alertsFieldAffects: { th: "หน้าที่แสดงประกาศ", en: "Where it shows" },
  alertsHintAffects: {
    th: "ถ้าไม่เลือกข้อใดเลย ประกาศจะแสดงทั่วทั้งเว็บไซต์",
    en: "If you tick nothing, the alert shows across the whole website",
  },
  alertsSurfaceShuttle: { th: "รถรับส่ง", en: "Shuttle" },
  alertsSurfaceCampus: { th: "แผนที่และสถานที่ในมหาวิทยาลัย", en: "Campus map and places" },
  alertsSurfaceForms: { th: "แบบฟอร์ม", en: "Forms" },
  alertsSurfaceSitewide: { th: "ทั่วทั้งเว็บไซต์", en: "Whole website" },
  alertsFieldStartsAt: { th: "เริ่มแสดงเมื่อ", en: "Starts showing" },
  alertsHintStartsAt: {
    th: "ประกาศที่เผยแพร่แล้วจะปรากฏบนเว็บไซต์ตั้งแต่เวลานี้ เวลาประเทศไทย",
    en: "A published alert appears on the website from this time. Thailand time",
  },
  alertsFieldEndsAt: { th: "หยุดแสดงเมื่อ", en: "Stops showing" },
  alertsHintEndsAt: {
    th: "เว้นว่างไว้ถ้ายังไม่ทราบเวลาสิ้นสุด แต่อย่าลืมปิดประกาศเมื่อไม่จำเป็นแล้ว",
    en: "Leave empty if you do not know yet, but remember to unpublish it once it is no longer needed",
  },
  alertsFieldMoreInfo: { th: "ลิงก์ข้อมูลเพิ่มเติม", en: "Link to more information" },
  alertsHintMoreInfo: { th: "ไม่บังคับ ต้องขึ้นต้นด้วย https://", en: "Optional. Start with https://" },
  alertsErrEndsBeforeStart: {
    th: "เวลาที่หยุดแสดงต้องไม่ก่อนเวลาที่เริ่มแสดง",
    en: "The time it stops showing must not be before the time it starts",
  },

  /* Events */
  eventsGroupWhen: { th: "วันและเวลา", en: "Date and time" },
  eventsGroupWhere: { th: "สถานที่", en: "Place" },
  eventsGroupAbout: { th: "รายละเอียดกิจกรรม", en: "About the event" },
  eventsGroupJoin: { th: "การลงทะเบียน", en: "Signing up" },
  eventsGroupCancel: { th: "การยกเลิก", en: "Cancellation" },
  eventsFieldStartsAt: { th: "เริ่มเมื่อ", en: "Starts" },
  eventsFieldEndsAt: { th: "สิ้นสุดเมื่อ", en: "Ends" },
  eventsHintEndsAt: {
    th: "เว้นว่างไว้ถ้าไม่มีเวลาสิ้นสุดที่แน่นอน",
    en: "Leave empty if there is no fixed end time",
  },
  eventsFieldAllDay: { th: "กิจกรรมตลอดทั้งวัน", en: "All day event" },
  eventsHintAllDay: {
    th: "ติ๊กถ้ากิจกรรมไม่มีเวลาเริ่มที่แน่นอน เว็บไซต์จะแสดงเฉพาะวันที่",
    en: "Tick if the event has no set start time. The website will show only the date",
  },
  eventsFieldLocation: { th: "ชื่อสถานที่", en: "Location name" },
  eventsHintLocation: {
    th: "เช่น ห้องประชุมใหญ่ อาคารกิจกรรมนักศึกษา ไม่บังคับ",
    en: "For example, Main Hall, Student Activities Building. Optional",
  },
  eventsFieldPlace: { th: "สถานที่บนแผนที่", en: "Place on the campus map" },
  eventsHintPlace: {
    th: "เลือกถ้ามีสถานที่นี้ในแผนที่มหาวิทยาลัย เพื่อให้ผู้อ่านเปิดดูแผนที่ได้",
    en: "Choose it if the place is on the campus map, so readers can open the map",
  },
  eventsFieldBody: { th: "รายละเอียด", en: "Details" },
  eventsHintSummary: {
    th: "ประโยคหรือสองประโยคที่แสดงในรายการกิจกรรม",
    en: "One or two sentences shown in the list of events",
  },
  eventsFieldRelatedForm: { th: "แบบฟอร์มที่เกี่ยวข้อง", en: "Related form" },
  eventsHintRelatedForm: {
    th: "เลือกถ้ากิจกรรมนี้มีแบบฟอร์มที่ผู้อ่านต้องกรอก",
    en: "Choose it if readers need to fill in a form for this event",
  },
  eventsFieldRegistrationUrl: { th: "ลิงก์ลงทะเบียน", en: "Sign-up link" },
  eventsHintRegistrationUrl: { th: "ไม่บังคับ ต้องขึ้นต้นด้วย https://", en: "Optional. Start with https://" },
  eventsFieldCancelled: { th: "กิจกรรมนี้ถูกยกเลิก", en: "This event is cancelled" },
  eventsHintCancelled: {
    th: "เว็บไซต์จะยังแสดงกิจกรรมนี้ พร้อมป้ายว่ายกเลิกแล้ว",
    en: "The website will still list the event, marked as cancelled",
  },
  eventsFieldCancellationNote: { th: "หมายเหตุการยกเลิก", en: "Cancellation note" },
  eventsHintCancellationNote: {
    th: "บอกเหตุผลหรือวันนัดใหม่ ถ้ามี",
    en: "Give the reason or the new date, if there is one",
  },
  eventsErrEndsBeforeStart: {
    th: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม",
    en: "The end time must be after the start time",
  },

  /* Policies */
  policiesGroupAbout: { th: "เกี่ยวกับนโยบาย", en: "About the policy" },
  policiesGroupProgress: { th: "ความคืบหน้า", en: "Progress" },
  policiesGroupLinks: { th: "นโยบายที่เกี่ยวข้องและหลักฐาน", en: "Related policy and evidence" },
  policiesGroupUpdates: { th: "บันทึกความคืบหน้า", en: "Progress updates" },
  policiesFieldArea: { th: "ด้านของนโยบาย", en: "Policy area" },
  policiesHintArea: { th: "เช่น สวัสดิการ การเดินทาง กิจกรรมนักศึกษา", en: "For example, welfare, transport, student activities" },
  policiesFieldDetail: { th: "รายละเอียดนโยบาย", en: "Policy details" },
  policiesFieldStatus: { th: "สถานะปัจจุบัน", en: "Current status" },
  policiesFieldProgress: { th: "ความคืบหน้า (ร้อยละ)", en: "Progress (per cent)" },
  policiesHintProgress: {
    th: "ตัวเลข 0 ถึง 100 ที่กรอกเอง ระบบไม่คำนวณให้ เว้นว่างไว้ถ้าไม่ต้องการแสดง",
    en: "A number from 0 to 100 that you enter yourself. It is not worked out for you. Leave empty to show none",
  },
  policiesFieldStarted: { th: "วันที่เริ่ม", en: "Start date" },
  policiesFieldTarget: { th: "วันที่กำหนดเสร็จ", en: "Target date" },
  policiesFieldCompleted: { th: "วันที่เสร็จ", en: "Completion date" },
  policiesFieldOversight: { th: "นโยบายของ อมธ. ที่ติดตามตรวจสอบ", en: "TUSU policy being scrutinised" },
  policiesHintOversight: {
    th: "สำหรับรายการของสภานักศึกษา: เลือกนโยบายของ อมธ. ที่สภานักศึกษาติดตามตรวจสอบ",
    en: "For a TUSC item: choose the TUSU policy that TUSC is scrutinising",
  },
  policiesFieldEvidence: { th: "ลิงก์หลักฐาน", en: "Evidence links" },
  policiesFieldEvidenceItem: { th: "ลิงก์หลักฐาน", en: "Evidence link" },
  policiesHintEvidence: {
    th: "เอกสารหรือหน้าเว็บที่ยืนยันความคืบหน้า",
    en: "Documents or web pages that back up the progress",
  },
  policiesFieldLinkLabel: { th: "ข้อความลิงก์", en: "Link text" },
  policiesFieldLinkUrl: { th: "ที่อยู่ลิงก์", en: "Link address" },
  policiesFieldLinkDescription: { th: "คำอธิบายสั้น", en: "Short description" },
  policiesFieldLinkSignIn: { th: "ต้องเข้าสู่ระบบก่อนเปิดลิงก์นี้", en: "Readers must sign in to open this link" },
  policiesFieldUpdates: { th: "ประวัติความคืบหน้า", en: "Update history" },
  policiesFieldUpdate: { th: "บันทึก", en: "Update" },
  policiesHintUpdates: {
    th: "เพิ่มบันทึกใหม่ทุกครั้งที่มีความคืบหน้า เว็บไซต์จะเรียงจากใหม่ไปเก่าให้เอง",
    en: "Add an update each time there is progress. The website puts the newest first for you",
  },
  policiesFieldUpdateDate: { th: "วันที่", en: "Date" },
  policiesFieldUpdateNote: { th: "บันทึก", en: "Note" },
  policiesFieldUpdateStatus: { th: "สถานะ ณ วันนั้น", en: "Status on that date" },
  policiesFieldUpdateAuthor: { th: "ผู้บันทึก", en: "Recorded by" },
  policiesFieldUpdateEvidence: { th: "ลิงก์หลักฐาน", en: "Evidence link" },
  policiesErrTargetBeforeStart: {
    th: "วันที่กำหนดเสร็จต้องไม่ก่อนวันที่เริ่ม",
    en: "The target date must not be before the start date",
  },
  policiesErrCompletedBeforeStart: {
    th: "วันที่เสร็จต้องไม่ก่อนวันที่เริ่ม",
    en: "The completion date must not be before the start date",
  },
  policiesErrOversightSelf: {
    th: "นโยบายไม่สามารถตรวจสอบตัวเองได้ เลือกนโยบายอื่น",
    en: "A policy cannot scrutinise itself. Choose a different policy",
  },
} as const satisfies Record<string, LocaleString>;
