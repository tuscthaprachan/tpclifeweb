import type { LocaleString } from "../config";

/**
 * Staff console strings for notifications: the bell in the top bar and the
 * notifications page. Each kind has a title and a body whose placeholders are
 * filled from the values stored with the notification, in the reader's
 * language, when the page loads. Keys start with `nt`.
 */
export const NOTIFICATION_STRINGS = {
  ntLink: { th: "การแจ้งเตือน", en: "Notifications" },
  ntTitle: { th: "การแจ้งเตือน", en: "Notifications" },
  ntIntro: {
    th: "เรื่องที่มอบหมายให้คุณ การกล่าวถึงคุณในบันทึก ข้อร้องเรียนที่ส่งต่อ อุปกรณ์ที่เกินกำหนดคืน และคำเชิญที่มีผู้ตอบรับ",
    en: "Cases assigned to you, mentions in notes, escalated complaints, overdue equipment and accepted invitations.",
  },
  ntBellLabel: { th: "การแจ้งเตือน", en: "Notifications" },
  ntBellUnread: { th: "การแจ้งเตือน ยังไม่ได้อ่าน {count} รายการ", en: "Notifications, {count} unread" },

  ntViewLabel: { th: "แสดงการแจ้งเตือน", en: "Show notifications" },
  ntViewUnread: { th: "ยังไม่ได้อ่าน", en: "Unread" },
  ntViewAll: { th: "ทั้งหมด", en: "All" },
  ntFilterKind: { th: "ประเภท", en: "Type" },
  ntKindAny: { th: "ทุกประเภท", en: "All types" },
  ntApply: { th: "กรอง", en: "Filter" },
  ntClear: { th: "ล้างตัวกรอง", en: "Clear filters" },

  ntKindCaseAssigned: { th: "มอบหมายเรื่องให้คุณ", en: "Case assigned to you" },
  ntKindCaseMention: { th: "มีการกล่าวถึงคุณในบันทึก", en: "You were mentioned in a note" },
  ntKindComplaintEscalated: { th: "ส่งต่อข้อร้องเรียน", en: "Complaint escalated" },
  ntKindBorrowingOverdue: { th: "อุปกรณ์เกินกำหนดคืน", en: "Equipment return overdue" },
  ntKindInviteAccepted: { th: "คำเชิญได้รับการตอบรับ", en: "Invitation accepted" },
  ntKindOther: { th: "การแจ้งเตือน", en: "Notification" },

  ntBodyCaseAssigned: { th: "{actor} มอบหมายเรื่อง {reference} ให้คุณ", en: "{actor} assigned {reference} to you." },
  ntBodyCaseMention: { th: "{actor} กล่าวถึงคุณในบันทึกของเรื่อง {reference}", en: "{actor} mentioned you in a note on {reference}." },
  ntBodyEscalatedAcknowledge: { th: "เรื่อง {reference} ยังไม่ได้รับทราบภายในกำหนด", en: "{reference} was not acknowledged by its target date." },
  ntBodyEscalatedResolve: { th: "เรื่อง {reference} เกินกำหนดแก้ไข", en: "{reference} has passed its resolution target." },
  ntBodyBorrowingOverdue: { th: "คำขอ {reference} ถึงกำหนดคืนเมื่อ {date} และยังไม่ได้คืน", en: "{reference} was due back on {date} and has not been returned." },
  ntBodyInviteAccepted: { th: "{name} ตอบรับคำเชิญของคุณแล้ว", en: "{name} accepted your invitation." },

  ntListLabel: { th: "รายการการแจ้งเตือน", en: "Notification list" },
  ntCount: { th: "{count} รายการ", en: "{count} notifications" },
  ntCountOne: { th: "1 รายการ", en: "1 notification" },
  ntStatusUnread: { th: "ยังไม่ได้อ่าน", en: "Unread" },
  ntStatusRead: { th: "อ่านแล้ว", en: "Read" },
  ntOpen: { th: "เปิด", en: "Open" },
  ntMarkRead: { th: "ทำเครื่องหมายว่าอ่านแล้ว", en: "Mark as read" },
  ntMarkAllRead: { th: "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว", en: "Mark all as read" },
  ntAllMarked: { th: "ทำเครื่องหมายว่าอ่านแล้วทั้งหมด", en: "All notifications marked as read" },
  ntOneMarked: { th: "ทำเครื่องหมายว่าอ่านแล้ว", en: "Notification marked as read" },
  ntEmptyUnreadTitle: { th: "ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน", en: "No unread notifications" },
  ntEmptyUnreadBody: { th: "การแจ้งเตือนใหม่จะแสดงที่นี่และที่ไอคอนกระดิ่งด้านบนของทุกหน้า", en: "New ones appear here and on the bell at the top of every page." },
  ntEmptyAllTitle: { th: "ยังไม่มีการแจ้งเตือน", en: "No notifications yet" },
  ntEmptyAllBody: { th: "เมื่อมีการมอบหมายเรื่อง การกล่าวถึง หรือเรื่องที่ต้องดูแล จะแสดงที่นี่", en: "Assignments, mentions and items that need attention will appear here." },
  ntEmptyFilteredBody: { th: "ลองล้างตัวกรองหรือเลือกแสดงทั้งหมด", en: "Try clearing the filters or showing all notifications." },
} as const satisfies Record<string, LocaleString>;
