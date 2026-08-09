/**
 * Shared UI vocabulary.
 *
 * One word for one thing, in both languages. If two parts of the site need to
 * say "file this form", they say it identically. Add to this file rather than
 * writing a string inline, because a synonym invented in one component is how a
 * service stops feeling like one service.
 *
 * House style, applied to every string here and everywhere else:
 *   - Official register. Plain, direct, no filler and no jokes.
 *   - Say what the reader does or gets, not what the site is.
 *   - Never write about the website itself.
 *   - No em dashes. Use a comma, a full stop, or restructure the sentence.
 *   - Thai is written as Thai, not as a translation of the English.
 *
 * This file is a shared contract. Treat it as fixed.
 */

import type { Locale, LocaleString } from "./config";

export const UI = {
  /* Global chrome */
  serviceName: { th: "ท้ายท่าพระจันทร์", en: "TPC Life" },
  skipToContent: { th: "ข้ามไปยังเนื้อหาหลัก", en: "Skip to main content" },
  mainMenu: { th: "เมนูหลัก", en: "Main menu" },
  footerMenu: { th: "เมนูท้ายเว็บไซต์", en: "Footer navigation" },
  openMenu: { th: "เปิดเมนู", en: "Open menu" },
  closeMenu: { th: "ปิดเมนู", en: "Close menu" },
  close: { th: "ปิด", en: "Close" },
  changeLanguage: { th: "เปลี่ยนภาษา", en: "Change language" },
  breadcrumb: { th: "เส้นทางหน้า", en: "Breadcrumb" },
  home: { th: "หน้าแรก", en: "Home" },
  back: { th: "ย้อนกลับ", en: "Back" },
  menu: { th: "เมนู", en: "Menu" },
  theme: { th: "ธีม", en: "Theme" },
  themeLight: { th: "สว่าง", en: "Light" },
  themeDark: { th: "มืด", en: "Dark" },
  themeSystem: { th: "ตามระบบ", en: "System" },

  /* Search */
  search: { th: "ค้นหา", en: "Search" },
  searchLabel: { th: "ค้นหาข้อมูลนักศึกษาท่าพระจันทร์", en: "Search Tha Prachan student information" },
  searchPlaceholder: { th: "ค้นหาแบบฟอร์ม รถรับส่ง สวัสดิการ กิจกรรม", en: "Search forms, shuttle, welfare, activities" },
  searchHint: {
    th: "พิมพ์คำค้นได้ทั้งภาษาไทยและภาษาอังกฤษ",
    en: "You can search in Thai or English",
  },
  searchSubmit: { th: "ค้นหา", en: "Search" },
  searchClear: { th: "ล้างคำค้น", en: "Clear search" },
  searchResults: { th: "ผลการค้นหา", en: "Search results" },
  searchNoResults: { th: "ไม่พบผลการค้นหา", en: "No results found" },
  searchNoResultsHelp: {
    th: "ลองใช้คำอื่น หรือดูรายการทั้งหมดจากเมนูหลัก",
    en: "Try another word, or browse the full list from the main menu",
  },
  searchLoading: { th: "กำลังค้นหา", en: "Searching" },

  /* At a glance */
  atAGlance: { th: "ข้อมูลวันนี้", en: "Today at a glance" },
  nextDeparture: { th: "รอบถัดไป", en: "Next departure" },
  departsIn: { th: "อีก", en: "In" },
  minutes: { th: "นาที", en: "min" },
  hours: { th: "ชั่วโมง", en: "hr" },
  departingNow: { th: "กำลังออก", en: "Departing now" },
  /*
   * This label is load-bearing. There is no GPS feed for the Tha Prachan
   * shuttle, so every time shown is computed from the published timetable.
   * Do not replace this with "live" under any circumstances.
   */
  scheduled: { th: "ตามตารางเวลา", en: "Scheduled" },
  scheduledExplainer: {
    th: "เวลานี้คำนวณจากตารางเวลาที่ประกาศไว้ ไม่ใช่ตำแหน่งรถจริง",
    en: "These times come from the published timetable, not from vehicle tracking",
  },
  noServiceToday: { th: "วันนี้ไม่มีให้บริการ", en: "No service today" },
  lastDeparted: { th: "รอบสุดท้ายออกแล้ว", en: "Last departure has gone" },
  firstDepartureTomorrow: { th: "รอบแรกพรุ่งนี้", en: "First departure tomorrow" },
  viewTimetable: { th: "ดูตารางเวลาทั้งหมด", en: "View full timetable" },
  openNow: { th: "เปิดอยู่", en: "Open now" },
  closedNow: { th: "ปิดอยู่", en: "Closed" },
  opensAt: { th: "เปิด", en: "Opens" },
  closesAt: { th: "ปิด", en: "Closes" },

  /* Forms */
  forms: { th: "แบบฟอร์ม", en: "Forms" },
  formsIntro: {
    th: "แบบฟอร์มทั้งหมดที่นักศึกษาท่าพระจันทร์ต้องใช้ รวมไว้ที่เดียว",
    en: "Every form a Tha Prachan student needs, in one place",
  },
  startForm: { th: "เริ่มกรอกแบบฟอร์ม", en: "Start now" },
  beforeYouStart: { th: "ก่อนเริ่มกรอก", en: "Before you start" },
  whatYouNeed: { th: "สิ่งที่ต้องเตรียม", en: "What you need" },
  whoCanUse: { th: "ใครใช้ได้บ้าง", en: "Who can use this" },
  /*
   * The emergency report form returns 401 to anonymous requests. Telling the
   * student this before they click is the entire point of the form records.
   */
  requiresSignIn: { th: "ต้องเข้าสู่ระบบ", en: "Sign in required" },
  requiresGoogleSignIn: {
    th: "ต้องเข้าสู่ระบบด้วยบัญชี Google ก่อนกรอก",
    en: "You must sign in with a Google account before filling this in",
  },
  noSignInNeeded: { th: "ไม่ต้องเข้าสู่ระบบ", en: "No sign in needed" },
  takesAbout: { th: "ใช้เวลาประมาณ", en: "Takes about" },
  whatHappensNext: { th: "ขั้นตอนต่อไป", en: "What happens next" },
  deadline: { th: "กำหนดส่ง", en: "Deadline" },
  formOwner: { th: "ผู้รับผิดชอบ", en: "Responsible body" },
  relatedForm: { th: "แบบฟอร์มที่เกี่ยวข้อง", en: "Related form" },
  relatedForms: { th: "แบบฟอร์มที่เกี่ยวข้อง", en: "Related forms" },
  opensInNewTab: { th: "เปิดในแท็บใหม่", en: "opens in a new tab" },
  externalSite: { th: "เว็บไซต์ภายนอก", en: "External site" },

  /* News, events, activity */
  news: { th: "ข่าวสาร", en: "News" },
  events: { th: "กิจกรรม", en: "Events" },
  upcomingEvents: { th: "กิจกรรมที่กำลังจะมาถึง", en: "Upcoming events" },
  latestNews: { th: "ข่าวล่าสุด", en: "Latest news" },
  allNews: { th: "ข่าวทั้งหมด", en: "All news" },
  allEvents: { th: "กิจกรรมทั้งหมด", en: "All events" },
  noUpcomingEvents: { th: "ยังไม่มีกิจกรรมที่กำหนดไว้", en: "No events scheduled" },
  eventCancelled: { th: "ยกเลิกแล้ว", en: "Cancelled" },
  allDay: { th: "ตลอดวัน", en: "All day" },
  location: { th: "สถานที่", en: "Location" },
  publishedOn: { th: "เผยแพร่เมื่อ", en: "Published" },

  /* Governance */
  policyTracker: { th: "ความคืบหน้านโยบาย", en: "Policy progress" },
  policyIntro: {
    th: "ความคืบหน้าของนโยบาย อมธ. ท่าพระจันทร์ และสภานักศึกษา ท่าพระจันทร์",
    en: "Progress on policies from TUSU Tha Prachan and TUSC Tha Prachan",
  },
  status: { th: "สถานะ", en: "Status" },
  statusNotStarted: { th: "ยังไม่เริ่ม", en: "Not started" },
  statusInProgress: { th: "กำลังดำเนินการ", en: "In progress" },
  statusDelivered: { th: "ดำเนินการแล้ว", en: "Delivered" },
  statusBlocked: { th: "ติดขัด", en: "Blocked" },
  statusDropped: { th: "ยกเลิก", en: "Dropped" },
  lastUpdated: { th: "อัปเดตล่าสุด", en: "Last updated" },
  noUpdatesYet: { th: "ยังไม่มีการอัปเดต", en: "No updates yet" },
  updateHistory: { th: "ประวัติการอัปเดต", en: "Update history" },
  oversightOf: { th: "ติดตามตรวจสอบนโยบาย", en: "Scrutiny of" },
  scrutinisedBy: { th: "ถูกติดตามตรวจสอบโดย", en: "Scrutinised by" },
  evidence: { th: "หลักฐานอ้างอิง", en: "Evidence" },
  owner: { th: "ผู้รับผิดชอบ", en: "Responsible body" },
  ownerTusu: { th: "อมธ. ท่าพระจันทร์", en: "TUSU Tha Prachan" },
  ownerTusc: { th: "สภานักศึกษา ท่าพระจันทร์", en: "TUSC Tha Prachan" },
  ownerUniversity: { th: "มหาวิทยาลัย", en: "University" },
  ownerJoint: { th: "ร่วมกัน", en: "Joint" },
  tusuFull: {
    th: "องค์การนักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์",
    en: "Thammasat University Student Union, Tha Prachan",
  },
  tuscFull: {
    th: "สภานักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์",
    en: "Thammasat University Student Council, Tha Prachan",
  },

  /* Content */
  welfare: { th: "สวัสดิการนักศึกษา", en: "Student welfare" },
  guide: { th: "คู่มือนักศึกษา", en: "Student guide" },
  directory: { th: "ทำเนียบชุมนุมและหน่วยงาน", en: "Directory" },
  gettingAround: { th: "การเดินทาง", en: "Getting around" },
  faq: { th: "คำถามที่พบบ่อย", en: "Common questions" },
  report: { th: "แจ้งเรื่อง", en: "Report something" },
  about: { th: "เกี่ยวกับ", en: "About" },
  relatedLinks: { th: "ลิงก์ที่เกี่ยวข้อง", en: "Related links" },
  relatedPages: { th: "หน้าที่เกี่ยวข้อง", en: "Related pages" },
  contact: { th: "ติดต่อ", en: "Contact" },
  lastReviewed: { th: "ตรวจสอบล่าสุด", en: "Last reviewed" },
  seeAll: { th: "ดูทั้งหมด", en: "See all" },

  /* Help. 3.2.6 Consistent Help, same words in the same place on every page. */
  needHelp: { th: "ต้องการความช่วยเหลือ", en: "Need help" },
  helpIntro: {
    th: "ติดต่อ อมธ. ท่าพระจันทร์ หรือสภานักศึกษา ท่าพระจันทร์ ได้ตามช่องทางนี้",
    en: "Contact TUSU Tha Prachan or TUSC Tha Prachan through these channels",
  },

  /* Filters and lists */
  filter: { th: "ตัวกรอง", en: "Filter" },
  filterBy: { th: "กรองตาม", en: "Filter by" },
  clearFilters: { th: "ล้างตัวกรอง", en: "Clear filters" },
  applyFilters: { th: "ใช้ตัวกรอง", en: "Apply filters" },
  showing: { th: "แสดง", en: "Showing" },
  of: { th: "จาก", en: "of" },
  results: { th: "รายการ", en: "results" },
  all: { th: "ทั้งหมด", en: "All" },
  category: { th: "หมวดหมู่", en: "Category" },
  categoryTransport: { th: "การเดินทาง", en: "Transport" },
  categoryWelfare: { th: "สวัสดิการ", en: "Welfare" },
  categoryActivity: { th: "กิจกรรม", en: "Activities" },
  categoryGovernance: { th: "การบริหาร", en: "Governance" },
  nothingHere: { th: "ยังไม่มีข้อมูลในส่วนนี้", en: "Nothing here yet" },

  /* Pagination */
  pagination: { th: "การแบ่งหน้า", en: "Pagination" },
  previousPage: { th: "หน้าก่อนหน้า", en: "Previous page" },
  nextPage: { th: "หน้าถัดไป", en: "Next page" },
  page: { th: "หน้า", en: "Page" },

  /* Form controls */
  warning: { th: "คำเตือน", en: "Warning" },
  day: { th: "วัน", en: "Day" },
  month: { th: "เดือน", en: "Month" },
  year: { th: "ปี", en: "Year" },
  /*
   * Character count templates. These are strings with a {count} placeholder
   * rather than functions, because CharacterCount is a Client Component and a
   * function prop cannot cross the server/client boundary. English needs a
   * separate singular; Thai does not inflect for number, so both Thai values
   * are identical and that is correct, not an oversight.
   */
  charactersRemaining: { th: "เหลืออีก {count} ตัวอักษร", en: "You have {count} characters remaining" },
  charactersRemainingOne: { th: "เหลืออีก {count} ตัวอักษร", en: "You have {count} character remaining" },
  charactersOver: { th: "เกินมา {count} ตัวอักษร", en: "You have {count} characters too many" },
  charactersOverOne: { th: "เกินมา {count} ตัวอักษร", en: "You have {count} character too many" },

  /* Errors */
  errorSummaryTitle: { th: "มีข้อผิดพลาด", en: "There is a problem" },
  pageNotFoundTitle: { th: "ไม่พบหน้าที่ต้องการ", en: "Page not found" },
  pageNotFoundBody: {
    th: "หน้าที่คุณเปิดอาจถูกย้ายหรือลบไปแล้ว ลองค้นหาหรือกลับไปหน้าแรก",
    en: "The page may have been moved or removed. Try searching, or go back to the home page",
  },
  errorTitle: { th: "เกิดข้อผิดพลาด", en: "Something went wrong" },
  errorBody: {
    th: "ลองใหม่อีกครั้ง หากยังไม่ได้ โปรดติดต่อตามช่องทางด้านล่าง",
    en: "Try again. If it keeps happening, contact us using the details below",
  },
  tryAgain: { th: "ลองใหม่", en: "Try again" },
  serviceUnavailableTitle: { th: "ระบบไม่พร้อมให้บริการชั่วคราว", en: "Service unavailable" },

  /* Phase banner */
  phaseAlpha: { th: "อัลฟา", en: "Alpha" },
  phaseBeta: { th: "เบตา", en: "Beta" },
  phaseAlphaNote: {
    th: "นี่คือบริการใหม่ที่ยังอยู่ระหว่างทดลอง ข้อมูลบางส่วนอาจยังไม่ครบ",
    en: "This is a new service still being tested. Some information may be incomplete",
  },
  phaseBetaNote: {
    th: "นี่คือบริการใหม่ ข้อเสนอแนะของคุณช่วยให้ดีขึ้นได้",
    en: "This is a new service. Your feedback will help improve it",
  },

  /* Feedback. One of the four measures the service is judged on. */
  feedbackQuestion: { th: "หน้านี้มีประโยชน์หรือไม่", en: "Was this page useful?" },
  feedbackYes: { th: "มีประโยชน์", en: "Yes" },
  feedbackNo: { th: "ไม่มีประโยชน์", en: "No" },
  feedbackThanks: { th: "ขอบคุณสำหรับข้อเสนอแนะ", en: "Thank you for your feedback" },

  /* Accessibility and legal */
  accessibility: { th: "การเข้าถึง", en: "Accessibility" },
  accessibilityStatement: { th: "แถลงการณ์การเข้าถึง", en: "Accessibility statement" },
  cookies: { th: "คุกกี้", en: "Cookies" },
} as const satisfies Record<string, LocaleString>;

export type UiKey = keyof typeof UI;

/** Reads a shared string in the active language. */
export function t(key: UiKey, locale: Locale): string {
  return UI[key][locale];
}
