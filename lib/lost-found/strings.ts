import { editableStrings } from "@/lib/i18n/editable";

/** What a person sees on their lost and found tracking page, and the standard reply to a rejected claim. */
export const LOST_FOUND_TEXT = editableStrings(
  "lib-lost-found",
  {
    stageWaiting: { th: "รอตรวจสอบ", en: "Waiting to be checked" },
    stageAccepted: { th: "ยืนยันแล้ว พร้อมให้มารับ", en: "Accepted, ready to collect" },
    stageNotAccepted: { th: "ยังยืนยันไม่ได้", en: "Not accepted" },
    stageReturned: { th: "คืนให้คุณแล้ว", en: "Returned to you" },
    stageClosed: { th: "ปิดคำขอแล้ว", en: "Claim closed" },
    claimReceived: { th: "ได้รับคำขอรับของแล้ว", en: "Claim received" },
    messageFromStaff: { th: "ข้อความจากเจ้าหน้าที่", en: "Message from staff" },
    deskAt: { th: "เคาน์เตอร์{desk}", en: "{desk} desk" },
    defaultRejectMessage: {
      th: "เรายังยืนยันไม่ได้ว่าของชิ้นนี้เป็นของคุณจากรายละเอียดที่ให้ไว้ ของชิ้นนี้ยังอยู่ในรายการของที่พบ หากมีรายละเอียดเพิ่มเติม โปรดแจ้งหรือแวะมาที่เคาน์เตอร์",
      en: "We could not confirm from the details given that this item is yours. It is still on our list. If you can give more details, please tell us or visit the desk.",
    },
  },
  { th: "ของหายและของที่พบ: หน้าติดตามคำขอ", en: "Lost and found: claim tracking" },
);
