import type { LocaleString } from "../config";

/** Staff, security, account and sign-in page strings. Keys start with `cp`. */
export const CONSOLE_PEOPLE_STRINGS = {
  cpInviteStaff: { th: "เชิญเจ้าหน้าที่", en: "Invite staff" },
  cpPeopleDesc: { th: "ทุกคนที่มีบทบาทหรือเป็นสมาชิกของ อมธ. หรือสภานักศึกษา", en: "Everyone who holds a role or belongs to TUSU or TUSC." },
  cpPeopleCount: { th: "{count} คน", en: "{count} {count:person|people}" },
  cpPendingDesc: { th: "คำเชิญที่ยังไม่มีใครรับ ลิงก์จะหมดอายุเองตามวันที่ที่แสดง", en: "Invitations nobody has accepted yet. Each link stops working on the date shown." },
  cpColActions: { th: "การดำเนินการ", en: "Actions" },
  cpPasskeysDesc: {
    th: "อุปกรณ์ที่ใช้เข้าสู่ระบบ ควรมีอย่างน้อยสองเครื่อง เผื่อเครื่องหนึ่งหายหรือใช้งานไม่ได้",
    en: "The devices you sign in with. Keep at least two so you are never locked out.",
  },
  cpSessionHeading: { th: "เซสชันนี้", en: "This session" },
  cpSessionBody: {
    th: "เข้าสู่ระบบได้ถึง {time} การใช้งานคอนโซลจะต่อเวลาให้ แต่ไม่เกิน 12 ชั่วโมงรวม",
    en: "You are signed in until {time}. Working in the console extends this, up to 12 hours in total.",
  },
  cpSessionSignOutHint: { th: "ออกจากระบบเมื่อเสร็จงาน โดยเฉพาะบนเครื่องที่ใช้ร่วมกัน", en: "Sign out when you finish, especially on a shared computer." },
  cpConfirmBack: { th: "กลับ", en: "Go back" },
} as const satisfies Record<string, LocaleString>;
