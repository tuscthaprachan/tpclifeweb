import type { LocaleString } from "../config";

/** Content forms layout and site settings sections. */
export const CONSOLE_FORMS_STRINGS = {
  fmDetailsTitle: { th: "รายละเอียดการเผยแพร่", en: "Publishing details" },
  fmEnglishOf: { th: "ฉบับภาษาอังกฤษ: {label}", en: "English version: {label}" },
  fmSectionsNav: { th: "ส่วนในหน้านี้", en: "Sections on this page" },
  fmSiteSectionsTitle: { th: "ส่วนของการตั้งค่า", en: "Settings sections" },
  fmSiteSectionsHint: { th: "เลือกส่วนที่ต้องการแก้ไข แต่ละส่วนบันทึกแยกกัน ส่วนอื่นจะไม่ถูกเปลี่ยน", en: "Choose the part you want to change. Each part saves on its own and leaves the others as they are." },
  fmSiteBackToSections: { th: "กลับไปที่ส่วนของการตั้งค่า", en: "Back to settings sections" },
  fmSiteSecGeneral: { th: "ทั่วไป", en: "General" },
  fmSiteSecGeneralHint: { th: "ชื่อบริการ คำโปรยใต้ชื่อ และระยะของบริการ", en: "Service name, tagline and service stage." },
  fmSiteSecNavigation: { th: "เมนูหลัก", en: "Main menu" },
  fmSiteSecNavigationHint: { th: "รายการในเมนูด้านบนของเว็บไซต์", en: "The links in the menu at the top of the site." },
  fmSiteSecFooter: { th: "ท้ายหน้าและลิงก์", en: "Footer and links" },
  fmSiteSecFooterHint: { th: "เมนูท้ายหน้า และลิงก์ไปเว็บไซต์ขององค์กรอื่น", en: "The footer menu and links to other organisations' sites." },
  fmSiteSecHomeTasks: { th: "งานยอดนิยมหน้าแรก", en: "Home tasks" },
  fmSiteSecHomeTasksHint: { th: "ทางลัดที่แสดงในหน้าแรก", en: "The shortcuts shown on the home page." },
  fmSiteSecHelp: { th: "ช่องทางติดต่อ", en: "Help contacts" },
  fmSiteSecHelpHint: { th: "ช่องทางที่นักศึกษาใช้ขอความช่วยเหลือ", en: "How students can ask for help." },
  fmSiteNeedGeneral: { th: "ยังไม่มีการตั้งค่าเว็บไซต์ กรุณาบันทึกส่วน \"ทั่วไป\" ก่อน", en: "The site settings do not exist yet. Save the General section first." },
} as const satisfies Record<string, LocaleString>;
