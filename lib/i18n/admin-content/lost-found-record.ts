import type { LocaleString } from "../config";

/** Lost and found as one record (case plus listing). Prefix `lr`. */
export const LOST_FOUND_RECORD_STRINGS = {
  lfrIntroDraft: {
    th: "รายการนี้ยังไม่แสดงบนเว็บไซต์ แก้ไขข้อความ รูป และรายละเอียดการรับของได้ที่นี่ แล้วประกาศเมื่อพร้อม",
    en: "This listing is not on the website yet. Edit the text, pictures and collection details here, then publish when it is ready",
  },
  lfrIntroPublished: {
    th: "รายการนี้แสดงบนเว็บไซต์ การแก้ไขที่บันทึกจะแสดงทันที",
    en: "This listing is on the website. Changes you save show straight away",
  },
  lfrPublishedOn: { th: "ประกาศเมื่อ", en: "Published on" },
  lfrUnpublish: { th: "ยกเลิกการประกาศ", en: "Unpublish" },
  lfrUnpublishHint: {
    th: "นำรายการออกจากเว็บไซต์ เรื่องนี้ยังอยู่ในระบบและประกาศใหม่ได้ภายหลัง",
    en: "Takes the listing off the website. The case stays open and you can publish it again later",
  },
  lfrDetailsEdit: { th: "แก้ไขความคืบหน้า สถานที่เก็บ และช่องทางรับของ", en: "Edit progress, where it is kept and how to claim" },
  lfrDetailsSave: { th: "บันทึกรายละเอียด", en: "Save details" },
  lfrPhotosManage: { th: "จัดการรูปบนรายการ", en: "Manage listing pictures" },
  lfrPhotoRemove: { th: "นำรูปออก", en: "Remove picture" },
  lfrRevisions: { th: "ดูประวัติการแก้ไขของรายการ", en: "View the listing revision history" },
  lfrSavedUnpublished: { th: "ยกเลิกการประกาศแล้ว", en: "Listing unpublished" },
  lfrSavedDetails: { th: "บันทึกรายละเอียดแล้ว", en: "Details saved" },
  lfrSavedPhotoRemoved: { th: "นำรูปออกแล้ว", en: "Picture removed" },
  lfrNoAccessTitle: { th: "ของหายและของที่พบดูแลโดยเจ้าหน้าที่เคาน์เตอร์", en: "Lost and found is handled by desk officers" },
  lfrNoAccessBody: {
    th: "เรื่องของหายและของที่พบ รวมถึงรายการบนเว็บไซต์ จัดการจากหน้าเรื่องที่ได้รับโดยเจ้าหน้าที่เคาน์เตอร์ ไม่ต้องแก้ไขในส่วนเนื้อหาอีกต่อไป หากต้องการแก้ไขรายการ โปรดแจ้งเจ้าหน้าที่เคาน์เตอร์",
    en: "Lost and found reports and their public listings are now managed from the case page by desk officers, not from the content area. If a listing needs changing, ask a desk officer",
  },
} as const satisfies Record<string, LocaleString>;
