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
  serviceName: { th: "#ท้ายท่าพระจันทร์", en: "#trytpc" },
  skipToContent: { th: "ข้ามไปยังเนื้อหาหลัก", en: "Skip to main content" },
  mainMenu: { th: "เมนูหลัก", en: "Main menu" },
  footerMenu: { th: "เมนูท้ายเว็บไซต์", en: "Footer navigation" },
  openMenu: { th: "เปิดเมนู", en: "Open menu" },
  closeMenu: { th: "ปิดเมนู", en: "Close menu" },
  moreNav: { th: "เพิ่มเติม", en: "More" },
  currentSection: { th: "(หน้าปัจจุบันอยู่ในเมนูนี้)", en: "(contains the current page)" },
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
  searchLabel: { th: "ค้นหาข้อมูลนักศึกษาธรรมศาสตร์ท่าพระจันทร์", en: "Search Thammasat Tha Prachan student information" },
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
  departsIn: { th: "อีกประมาณ", en: "about" },
  minutes: { th: "นาที", en: "min" },
  hours: { th: "ชั่วโมง", en: "hr" },
  departingNow: { th: "กำลังออก", en: "Departing now" },
  /*
   * This label is load-bearing. There is no GPS feed for the Thammasat Tha
   * Prachan shuttle, so every time shown is computed from the published timetable.
   * Do not replace this with "live" under any circumstances.
   */
  scheduled: { th: "ตามตารางเวลา", en: "Scheduled" },
  scheduledShort: { th: "ตามตาราง", en: "Scheduled" },
  scheduledExplainer: {
    th: "เวลานี้มาจากตารางเวลาที่ประกาศไว้ ไม่ใช่ตำแหน่งรถจริง",
    en: "Times come from the published timetable, not from vehicle tracking",
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
    th: "แบบฟอร์มทั้งหมดที่นักศึกษาธรรมศาสตร์ท่าพระจันทร์ต้องใช้ รวมไว้ที่เดียว",
    en: "Every form a Thammasat Tha Prachan student needs, in one place",
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
  morePictures: { th: "ภาพเพิ่มเติม", en: "More pictures" },

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

  /* Lost and found */
  lostAndFound: { th: "ของหายและของเก็บได้", en: "Lost and found" },
  lostAndFoundIntro: {
    th: "ค้นหาของที่หาย และดูของที่มีคนเก็บมาส่งไว้ที่ธรรมศาสตร์ท่าพระจันทร์",
    en: "Search for something you lost, and see what has been handed in at Thammasat Tha Prachan",
  },
  lostItems: { th: "ของที่หาย", en: "Lost items" },
  foundItems: { th: "ของที่เก็บได้", en: "Found items" },
  /* The word on a single entry, so a list mixing both halves stays readable. */
  itemLost: { th: "หาย", en: "Lost" },
  itemFound: { th: "เก็บได้", en: "Found" },
  reportLostItem: { th: "แจ้งของหาย", en: "Report something lost" },
  reportFoundItem: { th: "แจ้งของที่เก็บได้", en: "Report something found" },
  lostFoundReference: { th: "เลขอ้างอิง", en: "Reference" },
  lostFoundReferenceHint: {
    th: "ใช้เลขนี้เมื่อติดต่อขอรับของคืน",
    en: "Quote this number when you contact the desk to collect it",
  },
  dateLost: { th: "วันที่หาย", en: "Date lost" },
  dateFound: { th: "วันที่เก็บได้", en: "Date found" },
  whereLost: { th: "หายที่ไหน", en: "Where it was lost" },
  whereFound: { th: "เก็บได้ที่ไหน", en: "Where it was found" },
  heldAt: { th: "เก็บรักษาไว้ที่", en: "Being held at" },
  collectBy: { th: "รับคืนภายใน", en: "Collect by" },
  howToClaim: { th: "วิธีขอรับคืน", en: "How to claim this" },
  claimCheckNote: {
    th: "ผู้ดูแลจะถามรายละเอียดของสิ่งของเพื่อยืนยันว่าเป็นของคุณจริง",
    en: "Whoever holds the item will ask you to describe it, to check it is yours",
  },
  lostFoundStatusOpen: { th: "ยังไม่มีผู้รับคืน", en: "Still open" },
  lostFoundStatusMatched: { th: "อยู่ระหว่างตรวจสอบ", en: "Being checked" },
  lostFoundStatusReturned: { th: "คืนเจ้าของแล้ว", en: "Returned" },
  lostFoundStatusUnclaimed: { th: "พ้นกำหนดรับคืน", en: "Claim window closed" },
  lostFoundStatusWithdrawn: { th: "ถอนรายการแล้ว", en: "Withdrawn" },
  lostFoundCategoryIdCard: { th: "บัตรนักศึกษาหรือบัตรประชาชน", en: "Student or ID card" },
  lostFoundCategoryBankCard: { th: "บัตรธนาคาร", en: "Bank card" },
  lostFoundCategoryKeys: { th: "กุญแจ", en: "Keys" },
  lostFoundCategoryWallet: { th: "กระเป๋าสตางค์", en: "Wallet or purse" },
  lostFoundCategoryPhone: { th: "โทรศัพท์", en: "Phone" },
  lostFoundCategoryLaptop: { th: "โน้ตบุ๊กและแท็บเล็ต", en: "Laptop or tablet" },
  lostFoundCategoryBag: { th: "กระเป๋า", en: "Bag" },
  lostFoundCategoryClothing: { th: "เสื้อผ้า", en: "Clothing" },
  lostFoundCategoryBook: { th: "หนังสือ", en: "Book" },
  lostFoundCategoryStationery: { th: "เครื่องเขียน", en: "Stationery" },
  lostFoundCategoryJewellery: { th: "เครื่องประดับ", en: "Jewellery or watch" },
  lostFoundCategoryEyewear: { th: "แว่นตา", en: "Glasses" },
  lostFoundCategoryUmbrella: { th: "ร่ม", en: "Umbrella" },
  lostFoundCategoryWaterBottle: { th: "ขวดน้ำ", en: "Water bottle" },
  lostFoundCategoryOther: { th: "อื่น ๆ", en: "Other" },
  noLostFoundItems: {
    th: "ยังไม่มีรายการที่ตรงกับตัวกรองนี้",
    en: "Nothing matches these filters yet",
  },
  /* The report form. */
  reportLostFoundIntro: {
    th: "กรอกรายละเอียดของสิ่งของ เจ้าหน้าที่จะตรวจสอบก่อนเผยแพร่ขึ้นหน้าเว็บไซต์",
    en: "Describe the item. Someone checks every report before it appears on this page",
  },
  reportLostFoundPrivacy: {
    th: "อย่ากรอกชื่อ เลขบัตรประชาชน หรือข้อมูลส่วนตัวของผู้อื่น รายละเอียดที่กรอกจะแสดงต่อสาธารณะ",
    en: "Do not enter anyone's name, ID number or personal details. What you write here becomes public",
  },
  reportLostFoundHoldBack: {
    th: "เก็บรายละเอียดเฉพาะบางอย่างไว้ในช่องสำหรับเจ้าหน้าที่ เพื่อใช้ยืนยันตัวเจ้าของ",
    en: "Keep one identifying detail for the staff-only box, so a claim can be checked against it",
  },
  whatIsIt: { th: "สิ่งของอะไร", en: "What is the item" },
  describeIt: { th: "รายละเอียด", en: "Description" },
  privateDetail: { th: "รายละเอียดสำหรับเจ้าหน้าที่", en: "Detail for staff only" },
  yourContact: { th: "ช่องทางติดต่อของคุณ", en: "How we can reach you" },
  yourContactHint: {
    th: "อีเมลหรือไอดีไลน์ ใช้ติดต่อกลับเท่านั้น ไม่แสดงบนหน้าเว็บไซต์",
    en: "Email or LINE ID. Used to contact you only, and never shown on this page",
  },
  /*
   * The filter legend and the report form's first question ask the same
   * thing, so they are one string. `itemLost` and `itemFound` label a single
   * entry; this labels the choice between them.
   */
  lostOrFound: { th: "หายหรือเก็บได้", en: "Lost or found" },
  notInThisList: { th: "ไม่มีในรายการ", en: "Not in this list" },
  describeLocation: { th: "อธิบายตำแหน่งด้วยตัวเอง", en: "Describe the location yourself" },
  /*
   * A student cannot attach a photo. Anonymous asset upload would mean a
   * storage write token in the browser bundle, so pictures are added by an
   * editor afterwards. Saying so is better than a file input that discards
   * what a worried student just uploaded.
   */
  reportNoPhotoNote: {
    th: "แบบฟอร์มนี้ไม่รับรูปภาพ เจ้าหน้าที่จะเพิ่มรูปให้หลังจากตรวจสอบรายงานนี้",
    en: "This form does not accept a photo. Staff add a picture once they have reviewed this report",
  },
  sending: { th: "กำลังส่ง", en: "Sending" },
  submitReport: { th: "ส่งรายงาน", en: "Send report" },
  reportReceivedTitle: { th: "ได้รับรายงานแล้ว", en: "Report received" },
  reportReceivedBody: {
    th: "เจ้าหน้าที่จะตรวจสอบและเผยแพร่รายการนี้ หากมีข้อสงสัยจะติดต่อกลับตามช่องทางที่ให้ไว้",
    en: "Someone will check this report and publish the entry. If anything is unclear, they will contact you",
  },
  reportUnavailable: {
    th: "ขณะนี้ยังไม่สามารถรับรายงานผ่านเว็บไซต์ได้ โปรดติดต่อตามช่องทางด้านล่าง",
    en: "Reports cannot be sent from this page right now. Please use the contact details below",
  },

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
  /*
   * Field-level validation messages. Shared rather than per-form, because a
   * reader who meets the same mistake twice should meet the same sentence
   * twice. They say what to do, not what the reader did wrong.
   */
  errorFieldRequired: {
    th: "กรุณากรอกข้อมูลนี้ก่อนส่งรายงาน",
    en: "Fill this in before you send the report",
  },
  errorInvalidDate: {
    th: "ระบุวันที่ให้ถูกต้อง และไม่เป็นวันในอนาคต",
    en: "Enter a real date that is not in the future",
  },
  errorLocationRequired: {
    th: "เลือกสถานที่จากรายการ หรือกรอกตำแหน่งด้วยตัวเองด้านล่าง",
    en: "Choose a place from the list, or describe the location yourself below",
  },
  errorReportNotSaved: {
    th: "ไม่สามารถบันทึกรายงานได้ในขณะนี้ ลองใหม่อีกครั้ง",
    en: "The report could not be saved right now. Try again",
  },
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

  /*
   * Lost and found, public journeys (lib/lost-found/public,
   * app/[locale]/lost-and-found). All keys start with `lfp`. Question pages
   * ask one thing each; hints say what to do and why, in plain words.
   */

  /* Start pages and shared pieces */
  lfpStartNow: { th: "เริ่มเลย", en: "Start now" },
  lfpYouWillNeed: { th: "สิ่งที่คุณต้องเตรียม", en: "What you will need" },
  lfpLostIntro: {
    th: "บอกเราว่าคุณทำอะไรหาย และติดต่อคุณได้อย่างไร เจ้าหน้าที่จะช่วยค้นหา และแจ้งคุณเมื่อพบของ ใช้เวลาประมาณ 5 นาที",
    en: "Tell us what you lost and how to reach you. Staff look for it and tell you if it turns up. It takes about 5 minutes",
  },
  lfpLostNeed1: { th: "ลักษณะของสิ่งของ", en: "A description of the item" },
  lfpLostNeed2: { th: "สถานที่และวันที่ที่คุณทำหาย (โดยประมาณก็ได้)", en: "Where and roughly when you lost it" },
  lfpLostNeed3: {
    th: "รายละเอียดหนึ่งอย่างที่มีแต่เจ้าของที่รู้ เช่น รอยหรือสิ่งของที่อยู่ข้างใน",
    en: "One detail only the owner would know, such as a mark or something inside",
  },
  lfpLostNeed4: { th: "ช่องทางติดต่อคุณ (อีเมล โทรศัพท์ หรือไลน์)", en: "A way to contact you (email, phone or LINE)" },
  lfpFoundIntro: {
    th: "ถ้าคุณเก็บของได้ นำไปส่งที่เคาน์เตอร์ อมธ. หรือ สภานักศึกษา ได้โดยตรง หรือแจ้งทางเว็บไซต์ก่อน เจ้าหน้าที่จะบันทึกและประกาศให้เจ้าของมารับ",
    en: "If you found something, you can hand it straight to the TUSU or TUSC desk, or report it here first. Staff log it and list it so the owner can claim it",
  },
  lfpFoundDeskNote: {
    th: "ไม่ว่าจะแจ้งทางเว็บไซต์หรือไม่ โปรดนำของไปส่งที่เคาน์เตอร์ อมธ. หรือ สภานักศึกษา เพื่อให้เจ้าหน้าที่เก็บรักษาไว้ ไม่ควรเก็บของไว้เอง",
    en: "Whether or not you report it online, please take the item to the TUSU or TUSC desk so staff can keep it safe. Please do not keep it yourself",
  },
  lfpFoundNeed1: { th: "ลักษณะของสิ่งของ", en: "A description of the item" },
  lfpFoundNeed2: { th: "สถานที่และวันที่ที่คุณเก็บได้", en: "Where and when you found it" },
  lfpFoundNeed3: { th: "ตอนนี้ของอยู่ที่ไหน", en: "Where the item is now" },
  lfpFoundNeed4: {
    th: "ช่องทางติดต่อคุณ ถ้าต้องการ (ไม่บังคับ)",
    en: "A way to contact you, if you want to (optional)",
  },
  lfpClaimIntro: {
    th: "บอกเราว่าคุณพิสูจน์ได้อย่างไรว่าเป็นเจ้าของ เจ้าหน้าที่จะตรวจสอบคำตอบกับรายละเอียดที่เก็บไว้ก่อนนัดรับของ",
    en: "Tell us how you can show this item is yours. Staff check your answer against what they hold before arranging collection",
  },
  lfpClaimNeed1: { th: "รายละเอียดที่มีแต่เจ้าของที่รู้", en: "Something only the owner would know" },
  lfpClaimNeed2: { th: "ช่องทางติดต่อคุณ (อีเมล โทรศัพท์ หรือไลน์)", en: "A way to contact you (email, phone or LINE)" },
  lfpThisIsMine: { th: "นี่คือของฉัน", en: "This is mine" },
  lfpClaimTitle: { th: "ขอรับของคืน", en: "Claim this item" },
  lfpClaimLegacy: {
    th: "รายการนี้ยังขอรับคืนทางเว็บไซต์ไม่ได้ ใช้ช่องทางติดต่อด้านล่าง และแจ้งเลขอ้างอิงของรายการ",
    en: "This item cannot be claimed online. Use the contact below and quote the item's reference number",
  },
  lfpClaimClosed: {
    th: "รายการนี้ไม่เปิดให้ขอรับคืนทางเว็บไซต์แล้ว อาจมีผู้รับคืนไปแล้วหรือถอนรายการออก ติดต่อเจ้าหน้าที่ตามช่องทางด้านล่าง",
    en: "This item can no longer be claimed online. It may have been returned or removed. Contact the desk using the details below",
  },
  lfpPrivacyLink: { th: "เราใช้ข้อมูลส่วนบุคคลของคุณอย่างไร", en: "How we use your personal data" },
  lfpTrackLink: { th: "ติดตามเรื่องที่แจ้งไว้", en: "Track a report you made" },
  lfpUnavailable: {
    th: "ขณะนี้ยังใช้บริการนี้ไม่ได้ โปรดติดต่อเจ้าหน้าที่ตามช่องทางด้านล่าง",
    en: "This service is not available right now. Please use the contact details below",
  },
  lfpContinue: { th: "ต่อไป", en: "Continue" },
  lfpSaveAndCheck: { th: "บันทึกและกลับไปตรวจคำตอบ", en: "Save and check your answers" },

  /* Question pages */
  lfpQCategory: { th: "สิ่งของเป็นประเภทใด", en: "What kind of item is it?" },
  lfpQDescribeLost: { th: "อธิบายสิ่งของที่หาย", en: "Describe what you lost" },
  lfpQDescribeFound: { th: "อธิบายสิ่งของที่คุณเก็บได้", en: "Describe what you found" },
  lfpTitleLabel: { th: "ชื่อสิ่งของ", en: "Item name" },
  lfpTitleHint: {
    th: "เช่น กระเป๋าเป้สีดำ หรือ หูฟังไร้สายสีขาว ไม่เกิน 80 ตัวอักษร",
    en: "For example, black backpack or white wireless earbuds. Up to 80 characters",
  },
  lfpDescriptionLabel: { th: "ลักษณะของสิ่งของ", en: "What it looks like" },
  lfpDescriptionHint: {
    th: "สี ยี่ห้อ ขนาด และลักษณะที่เห็นได้ชัด ไม่เกิน 600 ตัวอักษร",
    en: "Colour, make, size and anything easy to see. Up to 600 characters",
  },
  lfpDescribeGuidanceLost: {
    th: "อย่าใส่รายละเอียดที่มีแต่เจ้าของที่รู้ เช่น ชื่อที่เขียนไว้ข้างใน ภาพหน้าจอล็อก หรือของที่อยู่ในกระเป๋า เราจะถามเรื่องนี้ในหน้าถัดไปและเก็บเป็นความลับ สิ่งที่คุณเขียนในหน้านี้อาจแสดงต่อสาธารณะในหน้าของหายและของเก็บได้ หลังเจ้าหน้าที่ตรวจสอบแล้ว",
    en: "Do not include anything only the owner would know, such as a name written inside, a lock screen picture or what is in a bag. We ask for that on a later page and keep it private. What you write here may appear on the public lost and found page once staff have checked it",
  },
  lfpDescribeGuidanceFound: {
    th: "อย่าใส่รายละเอียดที่ใช้ยืนยันความเป็นเจ้าของ เช่น ชื่อที่เขียนไว้ข้างใน หมายเลขเครื่อง หรือของที่อยู่ข้างใน เจ้าหน้าที่จะใช้สิ่งเหล่านี้ตรวจสอบเจ้าของตัวจริง สิ่งที่คุณเขียนในหน้านี้อาจแสดงต่อสาธารณะ หลังเจ้าหน้าที่ตรวจสอบแล้ว",
    en: "Do not include anything that proves who owns it, such as a name written inside, a serial number or what is inside. Staff use those to check the real owner. What you write here may appear on the public lost and found page once staff have checked it",
  },
  lfpQWhereLost: { th: "คุณทำของหายที่ไหน", en: "Where did you lose it?" },
  lfpQWhereFound: { th: "คุณเก็บของได้ที่ไหน", en: "Where did you find it?" },
  lfpPlaceLabel: { th: "สถานที่ในมหาวิทยาลัย", en: "Place on campus" },
  lfpPlaceHint: {
    th: "เลือกจากรายการ ถ้าไม่แน่ใจหรือไม่มีในรายการ ให้เลือก ที่อื่น แล้วอธิบายด้านล่าง",
    en: "Choose from the list. If you are not sure, or it is not listed, choose Somewhere else and say where below",
  },
  lfpSomewhereElse: { th: "ที่อื่น หรือไม่แน่ใจ", en: "Somewhere else, or not sure" },
  lfpPlaceNoteLabel: { th: "อธิบายสถานที่เพิ่มเติม", en: "Say more about where" },
  lfpPlaceNoteHint: {
    th: "เช่น ชั้นไหน โต๊ะไหน หรือใกล้จุดใด ไม่เกิน 200 ตัวอักษร",
    en: "For example which floor, table or nearby landmark. Up to 200 characters",
  },
  lfpQWhenLost: { th: "คุณทำของหายเมื่อไร", en: "When did you lose it?" },
  lfpQWhenFound: { th: "คุณเก็บของได้เมื่อไร", en: "When did you find it?" },
  lfpWhenHint: {
    th: "เช่น 12 3 2569 ใส่ปีเป็น พ.ศ. หรือ ค.ศ. ก็ได้ ถ้าไม่แน่ใจ ให้ใส่วันที่ใกล้เคียงที่สุด",
    en: "For example, 12 3 2026. You can enter the year in the Thai (BE) or the western (CE) calendar. If you are not sure, give your best guess",
  },
  lfpQDetail: { th: "บอกรายละเอียดหนึ่งอย่างที่มีแต่คุณที่รู้", en: "Give one detail only you would know" },
  lfpDetailLabel: { th: "รายละเอียดที่เป็นความลับ", en: "Private detail" },
  lfpDetailHint: {
    th: "เช่น รอยขีดข่วน สติกเกอร์ใต้เคส ภาพหน้าจอล็อก หรือของที่อยู่ในกระเป๋า เราเก็บเป็นความลับ เจ้าหน้าที่ใช้ตรวจสอบว่าผู้ขอรับของเป็นเจ้าของจริง และไม่แสดงบนเว็บไซต์ ไม่เกิน 500 ตัวอักษร",
    en: "For example a scratch, a sticker under the case, the lock screen picture or something in a pocket. We keep it private. Staff use it to check that whoever claims the item is the owner. It is never shown on the website. Up to 500 characters",
  },
  lfpQWhereNow: { th: "ตอนนี้ของอยู่ที่ไหน", en: "Where is the item now?" },
  lfpWhereNowHandIn: {
    th: "ฉันเก็บไว้ และจะนำไปส่งที่เคาน์เตอร์ อมธ. หรือ สภานักศึกษา",
    en: "I have it and will take it to the TUSU or TUSC desk",
  },
  lfpWhereNowLeftThere: { th: "ฉันวางไว้ที่เดิม", en: "I left it where I found it" },
  lfpWhereNowNeedHelp: {
    th: "ฉันเก็บไว้ แต่นำไปส่งไม่ได้ ขอให้เจ้าหน้าที่ติดต่อกลับ",
    en: "I have it but cannot take it to the desk. Please contact me",
  },
  lfpQContact: { th: "ช่องทางติดต่อของคุณ", en: "Your contact details" },
  lfpContactHintLost: {
    th: "เราใช้ข้อมูลนี้แจ้งคุณเมื่อพบของและนัดรับของคืน เฉพาะเจ้าหน้าที่เท่านั้นที่เห็น และไม่แสดงบนเว็บไซต์ ให้อย่างน้อยหนึ่งช่องทาง",
    en: "We use these to tell you if we find your item and to arrange handover. Only staff see them, and they are never shown on the website. Give at least one way to reach you",
  },
  lfpContactHintFound: {
    th: "ไม่บังคับ ถ้าให้ไว้ เจ้าหน้าที่จะติดต่อคุณเฉพาะเรื่องของชิ้นนี้ เฉพาะเจ้าหน้าที่เท่านั้นที่เห็น",
    en: "Optional. If you give them, staff contact you only about this item. Only staff see them",
  },
  lfpContactHintFoundNeedHelp: {
    th: "คุณขอให้เจ้าหน้าที่ติดต่อกลับ จึงต้องให้อย่างน้อยหนึ่งช่องทาง เฉพาะเจ้าหน้าที่เท่านั้นที่เห็น",
    en: "You asked staff to contact you, so give at least one way to reach you. Only staff see them",
  },
  lfpContactHintClaim: {
    th: "เราใช้ข้อมูลนี้ติดต่อคุณเกี่ยวกับการขอรับของ เฉพาะเจ้าหน้าที่เท่านั้นที่เห็น และไม่แสดงบนเว็บไซต์ ให้อย่างน้อยหนึ่งช่องทาง",
    en: "We use these to contact you about this claim. Only staff see them, and they are never shown on the website. Give at least one way to reach you",
  },
  lfpNameLabel: { th: "ชื่อ-นามสกุล", en: "Full name" },
  lfpEmailLabel: { th: "อีเมล", en: "Email address" },
  lfpEmailHint: { th: "ถ้ามี เช่น name@example.com", en: "If you have one, for example name@example.com" },
  lfpPhoneLabel: { th: "เบอร์โทรศัพท์", en: "Phone number" },
  lfpLineLabel: { th: "ไอดีไลน์", en: "LINE ID" },
  lfpPreferredLegend: { th: "ให้ติดต่อทางช่องทางใดก่อน", en: "How should we contact you first?" },
  lfpPreferredEmail: { th: "อีเมล", en: "Email" },
  lfpPreferredPhone: { th: "โทรศัพท์", en: "Phone" },
  lfpPreferredLine: { th: "ไลน์", en: "LINE" },
  lfpPreferredHint: { th: "ตอบเฉพาะเมื่อคุณกรอกมากกว่าหนึ่งช่องทาง", en: "Only needed if you gave more than one way" },
  lfpConsentLegend: { th: "ความยินยอม", en: "Your agreement" },
  lfpConsentReport: {
    th: "ฉันยินยอมให้เจ้าหน้าที่ อมธ. และ สภานักศึกษา ติดต่อฉันเกี่ยวกับเรื่องนี้ตามช่องทางที่ให้ไว้",
    en: "I agree that TUSU and TUSC staff may contact me about this report using these details",
  },
  lfpConsentClaim: {
    th: "ฉันยินยอมให้เจ้าหน้าที่ อมธ. และ สภานักศึกษา ติดต่อฉันเกี่ยวกับการขอรับของตามช่องทางที่ให้ไว้",
    en: "I agree that TUSU and TUSC staff may contact me about this claim using these details",
  },
  lfpQProof: { th: "คุณพิสูจน์ได้อย่างไรว่าเป็นเจ้าของ", en: "How can you show the item is yours?" },
  lfpProofLabel: { th: "สิ่งที่มีแต่เจ้าของที่รู้", en: "Something only the owner would know" },
  lfpProofHint: {
    th: "อย่าเขียนซ้ำสิ่งที่ปรากฏในรายการอยู่แล้ว บอกรายละเอียดอื่น เช่น รอย สติกเกอร์ ของที่อยู่ข้างใน หรือภาพหน้าจอล็อก เจ้าหน้าที่ใช้เปรียบเทียบเท่านั้น และไม่แสดงต่อใคร ไม่เกิน 1,000 ตัวอักษร",
    en: "Do not repeat what the listing already says. Give something else, such as a mark, a sticker, what is inside or the lock screen picture. Staff use it only to compare and it is shown to no one. Up to 1,000 characters",
  },

  /* Check your answers */
  lfpCheckTitleReport: { th: "ตรวจคำตอบก่อนส่งรายงาน", en: "Check your answers before sending your report" },
  lfpCheckTitleClaim: { th: "ตรวจคำตอบก่อนส่งคำขอรับของ", en: "Check your answers before sending your claim" },
  lfpChange: { th: "เปลี่ยน", en: "Change" },
  lfpRowDetail: { th: "รายละเอียดที่เป็นความลับ", en: "Private detail" },
  lfpRowWhereNow: { th: "ตอนนี้ของอยู่ที่", en: "Where the item is now" },
  lfpRowProof: { th: "สิ่งที่มีแต่เจ้าของที่รู้", en: "Something only the owner would know" },
  lfpRowContact: { th: "ช่องทางติดต่อ", en: "Contact details" },
  lfpRowFirstContact: { th: "ติดต่อทางช่องทางใดก่อน", en: "Contact first by" },
  lfpRowAgreement: { th: "ความยินยอมให้ติดต่อ", en: "Agreed to be contacted" },
  lfpRowItem: { th: "สิ่งของที่ขอรับ", en: "Item you are claiming" },
  lfpAgreed: { th: "ยินยอม", en: "Agreed" },
  lfpNotGiven: { th: "ไม่ได้ระบุ", en: "Not given" },
  lfpPrivateNote: { th: "เก็บเป็นความลับ ไม่แสดงบนเว็บไซต์", en: "Kept private, never shown on the website" },
  lfpCheckPrivacy: {
    th: "เมื่อกดส่ง ถือว่าคุณรับทราบวิธีที่เราใช้ข้อมูลส่วนบุคคลตามประกาศความเป็นส่วนตัว",
    en: "By sending this you confirm you have read how we use your personal data in the privacy notice",
  },
  lfpSendReport: { th: "ยอมรับและส่งรายงาน", en: "Accept and send report" },
  lfpSendClaim: { th: "ยอมรับและส่งคำขอรับของ", en: "Accept and send claim" },

  /* Confirmation */
  lfpDoneClaimTitle: { th: "ได้รับคำขอรับของแล้ว", en: "Claim received" },
  lfpYourReference: { th: "เลขอ้างอิงของคุณ", en: "Your reference number" },
  lfpKeepLinkTitle: { th: "เก็บลิงก์ส่วนตัวของคุณไว้", en: "Keep your private link" },
  lfpKeepLinkBody: {
    th: "คุณต้องใช้ลิงก์นี้คู่กับเลขอ้างอิงเพื่อดูความคืบหน้า ใครมีลิงก์นี้ก็ดูความคืบหน้าของเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น",
    en: "You need this link, with your reference number, to see progress. Anyone with the link can see how this case is going, so do not share it",
  },
  lfpKeepLinkWarning: {
    th: "บันทึกลิงก์นี้ไว้ตอนนี้ เพื่อความปลอดภัย ลิงก์จะไม่แสดงบนหน้านี้อีกหลังผ่านไป 30 นาที",
    en: "Save this link now. For your security it will stop showing here after 30 minutes",
  },
  lfpYourLink: { th: "ลิงก์ส่วนตัวของคุณ", en: "Your private link" },
  lfpOpenTracking: { th: "เปิดหน้าติดตามเรื่อง", en: "Open your tracking page" },
  lfpEmailOffer: {
    th: "ส่งลิงก์นี้ไปที่อีเมลที่คุณให้ไว้ เพื่อให้เก็บไว้ได้ง่าย",
    en: "We can email this link to the address you gave, so it is easy to keep",
  },
  lfpEmailButton: { th: "ส่งลิงก์ให้ทางอีเมล", en: "Email me the link" },
  lfpEmailSent: {
    th: "ส่งลิงก์ไปที่อีเมลของคุณแล้ว อาจใช้เวลาสักครู่",
    en: "We have sent the link to your email address. It may take a few minutes",
  },
  lfpEmailFailed: {
    th: "ส่งอีเมลไม่สำเร็จ โปรดคัดลอกลิงก์ด้านบนเก็บไว้",
    en: "We could not send the email. Please copy the link above and keep it",
  },
  lfpWhatNext: { th: "ขั้นตอนต่อไป", en: "What happens next" },
  lfpNextLost1: {
    th: "เจ้าหน้าที่ตรวจสอบรายงานของคุณ และประกาศในหน้าของหายและของเก็บได้",
    en: "Staff check your report and add it to the public lost and found page",
  },
  lfpNextLost2: {
    th: "เจ้าหน้าที่ค้นหาจากของที่มีผู้นำมาส่ง ถ้าพบของที่อาจเป็นของคุณ จะติดต่อคุณตามช่องทางที่ให้ไว้",
    en: "Staff look through what has been handed in. If something may be yours, they contact you using the details you gave",
  },
  lfpNextLost3: {
    th: "คุณดูความคืบหน้าได้ทุกเมื่อด้วยลิงก์ส่วนตัว ถ้าพบของเองแล้ว ให้ยกเลิกเรื่องที่แจ้ง",
    en: "You can follow progress at any time with your private link. If you find it yourself, withdraw the report",
  },
  lfpNextFound1: {
    th: "ถ้ายังไม่ได้ส่งของ โปรดนำไปส่งที่เคาน์เตอร์ อมธ. หรือ สภานักศึกษา และแจ้งเลขอ้างอิงนี้",
    en: "If you have not already, take the item to the TUSU or TUSC desk and quote this reference number",
  },
  lfpNextFound2: {
    th: "เจ้าหน้าที่บันทึกของและประกาศให้เจ้าของมารับ หลังตรวจสอบรายงานของคุณ",
    en: "Staff log the item and list it for the owner once they have checked your report",
  },
  lfpNextFound3: {
    th: "ถ้าคุณให้ช่องทางติดต่อไว้ และเจ้าหน้าที่ต้องการข้อมูลเพิ่ม จะติดต่อคุณ",
    en: "If you gave contact details and staff need more information, they will contact you",
  },
  lfpNextClaim1: {
    th: "เจ้าหน้าที่เปรียบเทียบคำตอบของคุณกับรายละเอียดที่เก็บไว้ โดยไม่บอกคำตอบแก่ผู้อื่น",
    en: "Staff compare your answer with the details they hold. They do not tell anyone your answer",
  },
  lfpNextClaim2: {
    th: "เจ้าหน้าที่จะติดต่อคุณตามช่องทางที่ให้ไว้ เพื่อนัดรับของ นำบัตรนักศึกษาหรือบัตรที่มีรูปถ่ายมาด้วย",
    en: "Staff contact you using the details you gave to arrange collection. Bring your student card or other photo ID",
  },
  lfpNextClaim3: {
    th: "คุณดูความคืบหน้าของรายการนี้ได้ด้วยลิงก์ส่วนตัว",
    en: "You can follow this item's progress with your private link",
  },

  /* Tracking */
  lfpTrackTitle: { th: "ติดตามเรื่องที่แจ้งไว้", en: "Track a report you made" },
  lfpTrackIntro: {
    th: "กรอกเลขอ้างอิงและวางลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง หรือเปิดลิงก์นั้นโดยตรง",
    en: "Enter your reference number and paste the private link you were given when you sent your report. Or just open that link",
  },
  lfpTrackRefLabel: { th: "เลขอ้างอิง", en: "Reference number" },
  lfpTrackRefHint: { th: "เช่น LF-2026-0001", en: "For example, LF-2026-0001" },
  lfpTrackLinkLabel: { th: "ลิงก์ส่วนตัว", en: "Private link" },
  lfpTrackLinkHint: {
    th: "วางลิงก์ทั้งหมด หรือเฉพาะรหัสท้ายลิงก์",
    en: "Paste the whole link, or just the code at the end of it",
  },
  lfpTrackSubmit: { th: "ดูเรื่องของฉัน", en: "Show my report" },
  lfpTrackProblem: {
    th: "ไม่พบเรื่องที่ตรงกับข้อมูลนี้ ตรวจเลขอ้างอิงและลิงก์อีกครั้ง หากยังเข้าไม่ได้ ติดต่อเจ้าหน้าที่และแจ้งเลขอ้างอิง",
    en: "We could not find a report that matches. Check the reference number and link and try again. If you still cannot get in, contact the desk and quote your reference number",
  },
  lfpTrackLimited: {
    th: "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่",
    en: "Too many attempts. Wait a few minutes and try again",
  },
  /* {n} is a whole number of minutes. */
  lfpTrackLimitedIn: {
    th: "ลองหลายครั้งเกินไป ลองใหม่ได้ในอีก {n} นาที",
    en: "Too many attempts. Try again in {n} minutes",
  },
  lfpTrackLimitedInOne: {
    th: "ลองหลายครั้งเกินไป ลองใหม่ได้ในอีก 1 นาที",
    en: "Too many attempts. Try again in 1 minute",
  },
  lfpStatusTitleReport: { th: "เรื่องที่คุณแจ้ง", en: "Your report" },
  lfpStatusTitleItem: { th: "ความคืบหน้าของรายการนี้", en: "Progress on this item" },
  lfpStatusTitleClaim: { th: "ความคืบหน้าของคำขอรับของ", en: "Progress on your claim" },
  lfpClaimWhere: { th: "รับของได้ที่", en: "Where to collect" },
  lfpClaimCollectionDetails: { th: "รายละเอียดการมารับของ", en: "Collection details" },
  lfpStatusNow: { th: "สถานะตอนนี้", en: "Current status" },
  lfpReportedOn: { th: "รับเรื่องเมื่อ", en: "Received on" },
  lfpLastUpdated: { th: "อัปเดตล่าสุด", en: "Last updated" },
  lfpProgress: { th: "ความคืบหน้า", en: "Progress" },
  lfpWithdrawLink: { th: "ยกเลิกเรื่องที่แจ้ง", en: "Withdraw this report" },
  lfpForgetThisDevice: { th: "เลิกแสดงเรื่องนี้บนอุปกรณ์เครื่องนี้", en: "Stop showing this on this device" },
  lfpForgetNote: {
    th: "ลิงก์ส่วนตัวของคุณยังใช้ได้ คุณเพียงต้องเปิดลิงก์อีกครั้งเมื่อกลับมา",
    en: "Your private link still works. You just open it again when you come back",
  },
  lfpWithdrawnBanner: { th: "ยกเลิกเรื่องที่แจ้งแล้ว", en: "Your report has been withdrawn" },
  lfpWithdrawnBannerBody: {
    th: "เจ้าหน้าที่จะหยุดค้นหา และรายการของคุณจะไม่แสดงในหน้าของหายอีกต่อไป",
    en: "Staff will stop looking, and your entry no longer appears on the lost and found page",
  },
  lfpWithdrawTitle: { th: "ต้องการยกเลิกเรื่องที่แจ้งหรือไม่", en: "Do you want to withdraw your report?" },
  lfpWithdrawBody: {
    th: "เลือกยกเลิกถ้าคุณพบของแล้ว หรือไม่ต้องการให้เราค้นหาต่อ เจ้าหน้าที่จะหยุดค้นหา และรายการของคุณจะถูกถอนจากหน้าของหาย การยกเลิกนี้ย้อนกลับไม่ได้",
    en: "Do this if you have found the item, or no longer want us to look. Staff will stop looking and your entry is removed from the lost and found page. You cannot undo this",
  },
  lfpWithdrawYes: { th: "ยกเลิกเรื่องที่แจ้ง", en: "Yes, withdraw my report" },
  lfpWithdrawNo: { th: "ไม่ยกเลิก กลับไป", en: "No, go back" },
  lfpWithdrawFailed: {
    th: "ยกเลิกเรื่องนี้ไม่ได้ในขณะนี้ อาจเพราะเรื่องปิดไปแล้ว ติดต่อเจ้าหน้าที่ตามช่องทางด้านล่าง",
    en: "This report cannot be withdrawn now. It may already be closed. Contact the desk using the details below",
  },

  /* Errors on the journeys */
  lfpErrCategory: { th: "เลือกประเภทของสิ่งของ", en: "Choose what kind of item it is" },
  lfpErrTitle: { th: "กรอกชื่อสิ่งของ", en: "Enter the item name" },
  lfpErrTitleLong: { th: "ชื่อสิ่งของต้องไม่เกิน 80 ตัวอักษร", en: "The item name must be 80 characters or fewer" },
  lfpErrDescription: { th: "กรอกลักษณะของสิ่งของ", en: "Describe what the item looks like" },
  lfpErrDescriptionLong: { th: "ลักษณะของสิ่งของต้องไม่เกิน 600 ตัวอักษร", en: "The description must be 600 characters or fewer" },
  lfpErrPlace: { th: "เลือกสถานที่จากรายการ", en: "Choose a place from the list" },
  lfpErrWhere: {
    th: "เลือกสถานที่จากรายการ หรืออธิบายว่าเกิดที่ใด",
    en: "Choose a place from the list, or say where it was",
  },
  lfpErrWhereLong: { th: "คำอธิบายสถานที่ต้องไม่เกิน 200 ตัวอักษร", en: "The place description must be 200 characters or fewer" },
  lfpErrDetail: {
    th: "กรอกรายละเอียดหนึ่งอย่างที่มีแต่คุณที่รู้",
    en: "Enter one detail that only you would know",
  },
  lfpErrDetailLong: { th: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร", en: "The detail must be 500 characters or fewer" },
  lfpErrWhereNow: { th: "เลือกว่าตอนนี้ของอยู่ที่ไหน", en: "Choose where the item is now" },
  lfpErrProof: { th: "บอกสิ่งที่มีแต่เจ้าของที่รู้", en: "Say something only the owner would know" },
  lfpErrProofLong: { th: "คำตอบต้องไม่เกิน 1,000 ตัวอักษร", en: "Your answer must be 1,000 characters or fewer" },
  lfpErrName: { th: "กรอกชื่อ-นามสกุลของคุณ", en: "Enter your full name" },
  lfpErrNameLong: { th: "ชื่อต้องไม่เกิน 100 ตัวอักษร", en: "Your name must be 100 characters or fewer" },
  lfpErrContactMethod: {
    th: "กรอกอีเมล เบอร์โทรศัพท์ หรือไอดีไลน์อย่างน้อยหนึ่งช่องทาง",
    en: "Enter at least one of an email address, phone number or LINE ID",
  },
  lfpErrEmail: { th: "กรอกอีเมลให้ถูกต้อง เช่น name@example.com", en: "Enter an email address in the correct format, like name@example.com" },
  lfpErrPhone: { th: "กรอกเบอร์โทรศัพท์ให้ถูกต้อง เช่น 081 234 5678", en: "Enter a phone number in the correct format, like 081 234 5678" },
  lfpErrLine: { th: "กรอกไอดีไลน์ให้ถูกต้อง ไม่มีช่องว่าง", en: "Enter a LINE ID without spaces" },
  lfpErrPreferred: {
    th: "เลือกช่องทางที่ให้ติดต่อก่อน จากช่องทางที่คุณกรอก",
    en: "Choose which of the ways you entered we should use first",
  },
  lfpErrConsent: {
    th: "เลือกช่องนี้ เพื่อยินยอมให้เจ้าหน้าที่ติดต่อคุณ",
    en: "Select this box to agree that staff may contact you",
  },
  lfpErrTrackRef: { th: "กรอกเลขอ้างอิง", en: "Enter your reference number" },
  lfpErrTrackLink: { th: "วางลิงก์ส่วนตัวของคุณ", en: "Paste your private link" },
  lfpExpiredTitle: { th: "คำตอบของคุณหมดอายุแล้ว", en: "Your answers have expired" },
  lfpExpiredBody: {
    th: "เพื่อความเป็นส่วนตัว เราเก็บคำตอบที่ยังไม่ส่งไว้ไม่นาน กรุณาเริ่มใหม่",
    en: "For your privacy we only keep unfinished answers for a short time. Please start again",
  },
  lfpSubmitFailed: {
    th: "ส่งไม่สำเร็จ คำตอบของคุณยังอยู่ ลองส่งอีกครั้ง หรือติดต่อเจ้าหน้าที่ตามช่องทางด้านล่าง",
    en: "We could not send this. Your answers are still saved. Try again, or contact the desk using the details below",
  },
  lfpSubmitTooMany: {
    th: "มีการส่งหลายครั้งเกินไปจากการเชื่อมต่อนี้ รอสักครู่แล้วลองใหม่ หรือติดต่อเจ้าหน้าที่",
    en: "Too many submissions from this connection. Wait a while and try again, or contact the desk",
  },
  lfpSubmitProblemTitle: { th: "ส่งไม่สำเร็จ", en: "We could not send this" },

  /*
   * Complaints (app/[locale]/complaints). All keys start with `cp`. Question
   * pages ask one thing each; the service is run jointly by TUSU and TUSC. The
   * emergency route comes first on every entry page: a queue never sits in
   * front of an emergency.
   */
  cpServiceName: { th: "ข้อร้องเรียน", en: "Complaints" },
  cpIntro: {
    th: "แจ้งปัญหาหรือเรื่องที่ไม่พอใจเกี่ยวกับบริการ กิจกรรม หรือผู้ปฏิบัติงานของ อมธ. และ สภานักศึกษา ท่าพระจันทร์ เจ้าหน้าที่ของทั้งสองหน่วยงานดูแลร่วมกัน คุณไม่ต้องมีบัญชีผู้ใช้",
    en: "Tell us about a problem with a service, an activity or a person at TUSU or TUSC at Tha Prachan. Staff from both bodies handle complaints together. You do not need an account",
  },
  cpEmergencyTitle: { th: "เหตุฉุกเฉินไม่ต้องรอคิว", en: "In an emergency, do not use this form" },
  cpEmergencyBody: {
    th: "ข้อร้องเรียนนี้เจ้าหน้าที่อ่านในเวลาทำการ หากมีใครกำลังตกอยู่ในอันตรายหรือต้องการความช่วยเหลือทันที ให้ใช้ช่องทางแจ้งเหตุฉุกเฉินหรือโทรศัพท์ด้านล่าง",
    en: "Staff read complaints in working hours. If anyone is in danger or needs help now, use the emergency route or the phone numbers below",
  },
  cpEmergencyRoute: { th: "ไปที่หน้าแจ้งเหตุฉุกเฉิน", en: "Go to the emergency report route" },
  cpEmergencyPolice: { th: "ตำรวจ", en: "Police" },
  cpEmergencyMedical: { th: "ฉุกเฉินทางการแพทย์", en: "Medical emergency" },
  cpEmergencyShort: { th: "หากมีใครกำลังตกอยู่ในอันตราย อย่ารอ", en: "If anyone is in danger, do not wait." },
  cpYouChoose: { th: "คุณเลือกได้ว่าจะให้ข้อมูลแค่ไหน", en: "You choose how much to tell us about you" },
  cpYouChooseBody: { th: "ก่อนเริ่ม เราจะถามว่าคุณต้องการระบุตัวตนอย่างไร", en: "Before you start, we ask how you want to be identified" },
  cpYouChooseNamed: { th: "ระบุชื่อ: เจ้าหน้าที่เห็นชื่อและช่องทางติดต่อ", en: "Named: staff see your name and how to reach you" },
  cpYouChoosePseudonymous: { th: "ไม่เปิดเผยชื่อ: เรามีช่องทางติดต่อ แต่เจ้าหน้าที่ทั่วไปไม่เห็นชื่อของคุณ", en: "Name kept back: we can reach you, but ordinary handlers do not see your name" },
  cpYouChooseAnonymous: { th: "ไม่ระบุตัวตน: เราไม่เก็บชื่อหรือช่องทางติดต่อ คุณติดตามเรื่องได้ด้วยลิงก์ส่วนตัวที่แสดงให้ครั้งเดียว", en: "Anonymous: we keep no name or contact. You follow the complaint with a private link shown once" },
  cpYouWillNeed: { th: "สิ่งที่คุณต้องเตรียม", en: "What you will need" },
  cpNeed1: { th: "เล่าว่าเกิดอะไรขึ้น", en: "A description of what happened" },
  cpNeed2: { th: "ถ้ามี: วันเวลา สถานที่ และสิ่งที่คุณอยากให้แก้ไข", en: "If you have them: when and where it happened, and what would put it right" },
  cpNeed3: { th: "ถ้ามี: ภาพหรือไฟล์ PDF เป็นหลักฐาน (ไม่บังคับ)", en: "If you have them: photos or a PDF as evidence (optional)" },
  cpSensitiveNote: {
    th: "เรื่องการคุกคามหรือการเลือกปฏิบัติ และความปลอดภัย เป็นหัวข้ออ่อนไหว เจ้าหน้าที่ที่ได้รับมอบหมายเท่านั้นที่เห็น และเราจะแนะนำช่องทางสนับสนุนให้คุณ",
    en: "Harassment or discrimination, and safety, are sensitive categories. Only named staff can see them, and we will show you where to find support",
  },
  cpStartNow: { th: "เริ่มเลย", en: "Start now" },
  cpPrivacyLink: { th: "ประกาศความเป็นส่วนตัว", en: "Privacy notice" },
  cpTrackLink: { th: "ติดตามข้อร้องเรียนที่ส่งแล้ว", en: "Track a complaint you have sent" },
  cpUnavailable: {
    th: "ขณะนี้เรายังรับข้อร้องเรียนออนไลน์ไม่ได้ เราไม่เก็บข้อมูลของคุณไว้ ลองใหม่ภายหลัง หรือใช้ช่องทางแจ้งเหตุด้านล่าง",
    en: "We cannot take complaints online right now. Nothing of yours is stored. Try again later, or use the report route below",
  },
  cpExpiredTitle: { th: "คำตอบของคุณหมดอายุแล้ว", en: "Your answers have expired" },
  cpExpiredBody: {
    th: "เพื่อความเป็นส่วนตัว เราเก็บคำตอบที่ยังไม่ส่งไว้ไม่นาน กรุณาเริ่มใหม่",
    en: "For your privacy we only keep unfinished answers for a short time. Please start again",
  },
  cpSubmitFailed: {
    th: "ส่งไม่สำเร็จ คำตอบของคุณยังอยู่ ลองส่งอีกครั้ง หรือใช้ช่องทางแจ้งเหตุตามที่แนะนำ",
    en: "We could not send this. Your answers are still saved. Try again, or use the report route",
  },
  cpSubmitTooMany: {
    th: "มีการส่งหลายครั้งเกินไปจากการเชื่อมต่อนี้ รอสักครู่แล้วลองใหม่",
    en: "Too many submissions from this connection. Wait a while and try again",
  },
  cpSubmitProblemTitle: { th: "ส่งไม่สำเร็จ", en: "We could not send this" },
  cpContinue: { th: "ต่อไป", en: "Continue" },
  cpContinueWithout: { th: "ต่อไปโดยไม่แนบไฟล์", en: "Continue without a file" },
  cpSaveAndCheck: { th: "บันทึกและกลับไปตรวจคำตอบ", en: "Save and go back to check your answers" },
  cpOptional: { th: "ไม่บังคับ", en: "Optional" },
  cpChange: { th: "เปลี่ยน", en: "Change" },
  cpNotGiven: { th: "ไม่ได้ให้ไว้", en: "Not given" },

  cpQIdentity: { th: "คุณต้องการให้เรารู้จักคุณอย่างไร", en: "How do you want us to know you?" },
  cpIdentityHint: { th: "เลือกได้อย่างเดียว คุณเปลี่ยนใจได้ก่อนส่ง", en: "Choose one. You can change it before you send" },
  cpIdentityNamed: { th: "ระบุชื่อและช่องทางติดต่อ", en: "Give my name and how to reach me" },
  cpIdentityNamedHint: { th: "เจ้าหน้าที่เห็นชื่อและช่องทางติดต่อของคุณ เหมาะถ้าคุณอยากให้ติดต่อกลับ", en: "Staff see your name and contact details. Best if you want us to get back to you" },
  cpIdentityPseudonymous: { th: "ให้ช่องทางติดต่อ แต่ไม่เปิดเผยชื่อ", en: "Give a way to reach me, but keep my name back" },
  cpIdentityPseudonymousHint: { th: "เราติดต่อคุณได้ แต่เจ้าหน้าที่ทั่วไปไม่เห็นชื่อของคุณ เฉพาะหัวหน้าหน่วยงานที่เห็นได้เมื่อจำเป็น", en: "We can reach you, but ordinary handlers do not see your name. Only a service lead can, if it is needed" },
  cpIdentityAnonymous: { th: "ไม่ระบุตัวตน", en: "Stay anonymous" },
  cpIdentityAnonymousHint: { th: "เราไม่เก็บชื่อหรือช่องทางติดต่อ ติดต่อคุณไม่ได้ คุณติดตามเรื่องได้ด้วยลิงก์ส่วนตัวที่แสดงให้ครั้งเดียว ถ้าลิงก์หาย เรากู้คืนให้ไม่ได้", en: "We keep no name or contact and cannot reach you. You follow the complaint with a private link we show once. If you lose it, we cannot recover it" },
  cpQCategory: { th: "เรื่องของคุณเกี่ยวกับอะไร", en: "What is your complaint about?" },
  cpCategoryHint: { th: "เลือกหัวข้อที่ใกล้เคียงที่สุด เจ้าหน้าที่เปลี่ยนให้ภายหลังได้", en: "Choose the closest. Staff can change it later" },
  cpQDescribe: { th: "เกิดอะไรขึ้น", en: "What happened?" },
  cpDescribeGuidance: {
    th: "เล่าด้วยคำของคุณเอง ไม่ต้องจัดรูปแบบ ระบบเข้ารหัสสิ่งที่คุณเขียนทั้งหมด และเฉพาะเจ้าหน้าที่ที่ได้รับมอบหมายเปิดอ่านได้",
    en: "Tell it in your own words. There is no format. Everything you write is encrypted and only the staff handling it can open it",
  },
  cpDescriptionLabel: { th: "สิ่งที่เกิดขึ้น", en: "What happened" },
  cpDescriptionHint: { th: "ไม่เกิน 3,000 ตัวอักษร", en: "Up to 3,000 characters" },
  cpQWhen: { th: "เกิดขึ้นเมื่อไรและที่ไหน", en: "When and where did it happen?" },
  cpWhenLabel: { th: "เมื่อไร", en: "When" },
  cpWhenHint: { th: "เช่น “วันอังคารที่ 4 พฤศจิกายน ช่วงบ่าย” หรือ “ตลอดเดือนที่ผ่านมา”", en: "For example “Tuesday 4 November, in the afternoon” or “all of last month”" },
  cpWhereLabel: { th: "ที่ไหน", en: "Where" },
  cpWhereHint: { th: "เช่น อาคารหรือสถานที่ หรือกิจกรรมที่เกี่ยวข้อง", en: "For example the building or place, or the event it was part of" },
  cpErrWhenLong: { th: "ช่อง “เมื่อไร” ยาวเกิน 200 ตัวอักษร", en: "“When” is over 200 characters" },
  cpErrWhereLong: { th: "ช่อง “ที่ไหน” ยาวเกิน 300 ตัวอักษร", en: "“Where” is over 300 characters" },
  cpQRemedy: { th: "คุณอยากให้แก้ไขอย่างไร", en: "What would put it right?" },
  cpRemedyLabel: { th: "สิ่งที่อยากให้แก้ไข", en: "What would put it right" },
  cpRemedyHint: { th: "ไม่เกิน 1,000 ตัวอักษร เราไม่รับปากว่าจะทำได้ทุกอย่าง แต่จะพิจารณา", en: "Up to 1,000 characters. We cannot promise everything, but we will consider it" },
  cpQEvidence: { th: "คุณมีหลักฐานจะแนบไหม", en: "Do you have evidence to attach?" },
  cpEvidenceIntro: { th: "แนบภาพหรือไฟล์ PDF ได้สูงสุด {count} ไฟล์ ไฟล์ละไม่เกิน {size} MB ไฟล์เป็นส่วนตัว ไม่มีลิงก์สาธารณะ", en: "You can attach up to {count} photos or PDFs, each up to {size} MB. Files are private and have no public link" },
  cpEvidenceAdded: { th: "ไฟล์ที่แนบแล้ว", en: "Files attached" },
  cpEvidenceFull: { th: "แนบครบจำนวนแล้ว", en: "You have attached the most you can" },
  cpEvidenceUnavailableTitle: { th: "ตอนนี้แนบไฟล์ไม่ได้", en: "You cannot attach files right now" },
  cpEvidenceUnavailable: { th: "ระบบเก็บไฟล์ยังไม่พร้อม คุณส่งข้อร้องเรียนต่อได้โดยไม่แนบไฟล์", en: "File storage is not set up. You can carry on and send your complaint without a file" },
  cpFileLabel: { th: "เลือกไฟล์", en: "Choose a file" },
  cpFileHint: { th: "ภาพ JPG, PNG, WebP, HEIC หรือ PDF ไม่เกิน {size} MB", en: "A JPG, PNG, WebP, HEIC or PDF, up to {size} MB" },
  cpFileUpload: { th: "อัปโหลดไฟล์", en: "Upload file" },
  cpFileRemove: { th: "ลบไฟล์", en: "Remove" },
  cpFileUnnamed: { th: "ไฟล์ไม่มีชื่อ", en: "Unnamed file" },
  cpErrFileNone: { th: "เลือกไฟล์ก่อนกดอัปโหลด", en: "Choose a file before you upload" },
  cpErrFileEmpty: { th: "ไฟล์นี้ว่างเปล่า", en: "That file is empty" },
  cpErrFileTooLarge: { th: "ไฟล์ใหญ่เกินไป", en: "That file is too large" },
  cpErrFileType: { th: "ใช้ได้เฉพาะภาพ JPG, PNG, WebP, HEIC หรือไฟล์ PDF", en: "Only JPG, PNG, WebP, HEIC or PDF files can be attached" },
  cpErrFileTooMany: { th: "แนบครบจำนวนแล้ว ลบไฟล์เดิมก่อนถ้าต้องการเปลี่ยน", en: "You have attached the most you can. Remove one first to change it" },
  cpErrFileFailed: { th: "อัปโหลดไม่สำเร็จ ลองใหม่ หรือข้ามขั้นตอนนี้", en: "We could not upload that. Try again, or skip this step" },
  cpQContact: { th: "เราจะติดต่อคุณได้อย่างไร", en: "How can we reach you?" },
  cpContactHintNamed: { th: "ให้ช่องทางอย่างน้อยหนึ่งอย่าง ข้อมูลเข้ารหัสไว้ และเฉพาะเจ้าหน้าที่ที่ได้รับมอบหมายเห็น", en: "Give at least one way. It is encrypted and seen only by the staff handling the complaint" },
  cpContactHintPseudonymous: { th: "ให้ช่องทางอย่างน้อยหนึ่งอย่าง เจ้าหน้าที่ทั่วไปจะไม่เห็นชื่อที่คุณกรอก", en: "Give at least one way. Ordinary handlers will not see a name you give here" },
  cpNameLabel: { th: "ชื่อ", en: "Your name" },
  cpNameLabelPseudonymous: { th: "ชื่อ (ไม่บังคับ)", en: "Your name (optional)" },
  cpNameHintPseudonymous: { th: "เฉพาะหัวหน้าหน่วยงานที่เห็นได้เมื่อจำเป็น", en: "Only a service lead can see it, if it is needed" },
  cpEmailLabel: { th: "อีเมล", en: "Email address" },
  cpEmailHint: { th: "ไม่บังคับ ถ้ามี เราส่งลิงก์ส่วนตัวและแจ้งผลทางอีเมลได้", en: "Optional. If you give one, we can email your private link and the outcome" },
  cpPhoneLabel: { th: "เบอร์โทรศัพท์", en: "Phone number" },
  cpLineLabel: { th: "ไอดีไลน์", en: "LINE ID" },
  cpPreferredLegend: { th: "ช่องทางที่อยากให้ติดต่อก่อน", en: "Which should we use first?" },
  cpPreferredHint: { th: "เลือกเมื่อคุณให้มากกว่าหนึ่งช่องทาง", en: "Choose if you gave more than one" },
  cpPreferredEmail: { th: "อีเมล", en: "Email" },
  cpPreferredPhone: { th: "โทรศัพท์", en: "Phone" },
  cpPreferredLine: { th: "ไลน์", en: "LINE" },
  cpConsentLegend: { th: "การยินยอม", en: "Your agreement" },
  cpConsent: { th: "ฉันยินยอมให้เจ้าหน้าที่ติดต่อฉันเรื่องข้อร้องเรียนนี้ตามช่องทางที่ให้ไว้", en: "I agree that staff may contact me about this complaint using the details I gave" },
  cpErrIdentity: { th: "เลือกวิธีที่คุณต้องการให้เรารู้จักคุณ", en: "Choose how you want us to know you" },
  cpErrCategory: { th: "เลือกหัวข้อที่ใกล้เคียงที่สุด", en: "Choose the closest category" },
  cpErrDescription: { th: "เล่าว่าเกิดอะไรขึ้น", en: "Tell us what happened" },
  cpErrDescriptionLong: { th: "คำอธิบายยาวเกิน 3,000 ตัวอักษร ตัดให้สั้นลง", en: "The description is over 3,000 characters. Shorten it" },
  cpErrRemedyLong: { th: "ช่องนี้ยาวเกิน 1,000 ตัวอักษร ตัดให้สั้นลง", en: "This is over 1,000 characters. Shorten it" },
  cpErrName: { th: "กรอกชื่อของคุณ", en: "Enter your name" },
  cpErrNameLong: { th: "ชื่อยาวเกิน 100 ตัวอักษร", en: "Your name is over 100 characters" },
  cpErrEmail: { th: "กรอกอีเมลให้ถูกต้อง เช่น name@example.org", en: "Enter an email address in the correct format, like name@example.org" },
  cpErrPhone: { th: "กรอกเบอร์โทรศัพท์ให้ถูกต้อง ใช้ตัวเลขอย่างน้อย 7 หลัก", en: "Enter a phone number with at least 7 digits" },
  cpErrLine: { th: "ไอดีไลน์ต้องไม่มีช่องว่าง", en: "A LINE ID cannot contain spaces" },
  cpErrContactMethod: { th: "ให้ช่องทางติดต่ออย่างน้อยหนึ่งอย่าง: อีเมล เบอร์โทรศัพท์ หรือไอดีไลน์", en: "Give at least one way to reach you: an email address, a phone number or a LINE ID" },
  cpErrPreferred: { th: "เลือกช่องทางที่อยากให้ติดต่อก่อน", en: "Choose which way we should use first" },
  cpErrConsent: { th: "เลือกช่องนี้เพื่อยินยอมให้เจ้าหน้าที่ติดต่อคุณ", en: "Select this box to agree that staff may contact you" },

  cpCheckTitle: { th: "ตรวจคำตอบของคุณก่อนส่ง", en: "Check your answers before sending" },
  cpRowIdentity: { th: "การระบุตัวตน", en: "How you are known" },
  cpRowCategory: { th: "หัวข้อ", en: "Category" },
  cpRowEvidence: { th: "ไฟล์หลักฐาน", en: "Evidence files" },
  cpRowFirstContact: { th: "ติดต่อก่อนทาง", en: "First contact by" },
  cpRowAgreement: { th: "การยินยอม", en: "Agreement" },
  cpAgreed: { th: "ยินยอมให้ติดต่อ", en: "Agreed to be contacted" },
  cpRestrictedNote: { th: "หัวข้อนี้อ่อนไหว เจ้าหน้าที่ที่ได้รับมอบหมายเท่านั้นที่เห็น", en: "This category is sensitive. Only named staff can see it" },
  cpCheckAnonymous: { th: "คุณเลือกไม่ระบุตัวตน เราไม่เก็บชื่อหรือช่องทางติดต่อ และกู้ลิงก์ส่วนตัวที่หายให้ไม่ได้", en: "You chose to stay anonymous. We keep no name or contact, and cannot recover a private link that is lost" },
  cpCheckPrivacy: { th: "เมื่อกดส่ง เจ้าหน้าที่ที่ได้รับมอบหมายจะเห็นข้อร้องเรียนนี้ อ่านว่าเราดูแลข้อมูลของคุณอย่างไร", en: "When you send this, the staff handling it will see your complaint. Read how we look after your data" },
  cpSend: { th: "ยอมรับและส่งข้อร้องเรียน", en: "Accept and send complaint" },

  cpDoneTitle: { th: "ได้รับข้อร้องเรียนของคุณแล้ว", en: "Complaint received" },
  cpYourReference: { th: "เลขอ้างอิงของคุณ", en: "Your reference number" },
  cpKeepLinkTitle: { th: "เก็บลิงก์ส่วนตัวของคุณไว้", en: "Keep your private link" },
  cpKeepLinkBody: { th: "ใช้ลิงก์นี้ดูความคืบหน้า ขอยกเลิก เปิดเรื่องอีกครั้ง และให้คะแนนความพึงพอใจ เราแสดงลิงก์ให้ครั้งเดียว", en: "Use this link to see progress, withdraw, reopen and say how we did. We show it once" },
  cpKeepLinkBodyAnonymous: { th: "คุณเลือกไม่ระบุตัวตน ลิงก์นี้เป็นทางเดียวที่จะกลับมาดูเรื่องนี้ได้ เราไม่มีข้อมูลติดต่อคุณ จึงกู้ลิงก์ให้ไม่ได้", en: "You chose to stay anonymous. This link is the only way back to this complaint. We hold nothing to reach you, so we cannot recover it" },
  cpKeepLinkWarning: { th: "ใครมีลิงก์นี้ก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น", en: "Anyone with this link can see this complaint, so do not share it" },
  cpKeepLinkWarningAnonymous: { th: "บันทึกลิงก์นี้ตอนนี้ คัดลอกไปเก็บไว้ในที่ปลอดภัย ปิดหน้านี้แล้วจะแสดงอีกไม่ได้", en: "Save this link now. Copy it somewhere safe. Once you close this page we cannot show it again" },
  cpYourLink: { th: "ลิงก์ส่วนตัวของคุณ", en: "Your private link" },
  cpOpenTracking: { th: "เปิดหน้าติดตามเรื่อง", en: "Open the tracking page" },
  cpEmailOffer: { th: "ต้องการให้ส่งลิงก์ส่วนตัวไปที่อีเมลที่คุณให้ไว้ไหม", en: "Would you like the private link sent to the email address you gave?" },
  cpEmailButton: { th: "ส่งลิงก์ทางอีเมล", en: "Email me the link" },
  cpEmailSent: { th: "ส่งลิงก์ไปที่อีเมลของคุณแล้ว", en: "We emailed you the link" },
  cpEmailFailed: { th: "ส่งอีเมลไม่สำเร็จ ลิงก์ด้านบนยังใช้ได้ โปรดเก็บไว้", en: "We could not send the email. The link above still works, so keep it" },
  cpWhatNext: { th: "จากนี้จะเกิดอะไรขึ้น", en: "What happens next" },
  cpNextAcknowledge: { th: "เจ้าหน้าที่จะรับเรื่องภายในวันที่ {date}", en: "Staff will acknowledge it by {date}" },
  cpNextAcknowledgeNoDate: { th: "เจ้าหน้าที่จะรับเรื่องภายในไม่กี่วันทำการ", en: "Staff will acknowledge it within a few working days" },
  cpNextResolve: { th: "เราตั้งเป้าแจ้งผลภายในวันที่ {date}", en: "We aim to give you an answer by {date}" },
  cpNextResolveNoDate: { th: "เราจะแจ้งผลเมื่อมีผลการดำเนินการ", en: "We will tell you the outcome when there is one" },
  cpNextTrack: { th: "ดูความคืบหน้าได้ที่หน้าติดตามเรื่องด้วยลิงก์ส่วนตัวของคุณ", en: "Follow progress on the tracking page with your private link" },
  cpNextWho: { th: "เฉพาะเจ้าหน้าที่ที่ได้รับมอบหมายตามชื่อเท่านั้นที่เห็นเรื่องนี้", en: "Only the named staff for this category can see your complaint" },
  cpNextWhoShared: { th: "เจ้าหน้าที่ อมธ. และ สภานักศึกษา ที่ดูแลข้อร้องเรียนจะเห็นเรื่องนี้ในคิวเดียวกัน", en: "TUSU and TUSC staff who handle complaints will see it in one shared queue" },
  cpTargetNote: { th: "วันที่เหล่านี้นับเป็นวันทำการ (จันทร์ถึงศุกร์) เป็นเป้าหมาย ไม่ใช่คำรับประกัน", en: "These dates count working days (Monday to Friday). They are targets, not guarantees" },
  cpWellbeingTitle: { th: "ขอความช่วยเหลือด้านจิตใจและความเป็นอยู่", en: "Support for how you are feeling" },
  cpWellbeingBody: { th: "ถ้าเรื่องนี้กระทบจิตใจคุณ ศูนย์ TU Wellbeing ให้คำปรึกษาโดยไม่ต้องผ่านข้อร้องเรียนนี้ คุณติดต่อได้เลย", en: "If this has affected you, the TU Wellbeing Center can talk with you, separately from this complaint. You can contact them now" },
  cpWellbeingPhone: { th: "สายด่วน 24 ชั่วโมง", en: "24 hour phone line" },
  cpWellbeingLine: { th: "ไลน์", en: "LINE" },

  cpTrackTitle: { th: "ติดตามข้อร้องเรียน", en: "Track a complaint" },
  cpTrackIntro: { th: "กรอกเลขอ้างอิงและวางลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง หรือเปิดลิงก์นั้นโดยตรง", en: "Enter your reference number and paste the private link you were given when you sent it, or open that link directly" },
  cpTrackRefLabel: { th: "เลขอ้างอิง", en: "Reference number" },
  cpTrackRefHint: { th: "เช่น CP-2026-0001", en: "For example CP-2026-0001" },
  cpTrackLinkLabel: { th: "ลิงก์ส่วนตัว", en: "Private link" },
  cpTrackLinkHint: { th: "วางลิงก์ทั้งหมด หรือเฉพาะรหัสท้ายลิงก์", en: "Paste the whole link, or just its code" },
  cpTrackSubmit: { th: "ดูความคืบหน้า", en: "See progress" },
  cpErrTrackRef: { th: "กรอกเลขอ้างอิง", en: "Enter your reference number" },
  cpErrTrackLink: { th: "วางลิงก์ส่วนตัวของคุณ", en: "Paste your private link" },
  cpTrackProblem: { th: "เราไม่พบเรื่องที่ตรงกับเลขอ้างอิงและลิงก์นี้ ตรวจสอบแล้วลองอีกครั้ง", en: "We could not find a complaint that matches this reference and link. Check them and try again" },
  cpTrackLimited: { th: "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่", en: "Too many attempts. Wait a while and try again" },
  cpTrackAnonymousNote: { th: "ถ้าคุณส่งโดยไม่ระบุตัวตนและลิงก์หาย เรากู้คืนให้ไม่ได้ เพราะเราไม่มีข้อมูลติดต่อคุณ", en: "If you sent it anonymously and lost the link, we cannot recover it, because we hold nothing to reach you" },
  cpStatusTitle: { th: "ข้อร้องเรียนของคุณ", en: "Your complaint" },
  cpReference: { th: "เลขอ้างอิง", en: "Reference number" },
  cpStatusNow: { th: "สถานะ", en: "Status" },
  cpReceivedOn: { th: "ได้รับเมื่อ", en: "Received" },
  cpLastUpdated: { th: "อัปเดตล่าสุด", en: "Last updated" },
  cpCategoryRow: { th: "หัวข้อ", en: "Category" },
  cpAimAcknowledge: { th: "เป้าหมายรับเรื่อง", en: "We aim to acknowledge by" },
  cpAimResolve: { th: "เป้าหมายแจ้งผล", en: "We aim to answer by" },
  cpOutcome: { th: "ผลการดำเนินการ", en: "Outcome" },
  cpProgress: { th: "ความคืบหน้า", en: "Progress" },
  cpStatusAnonymous: { th: "คุณส่งโดยไม่ระบุตัวตน เราติดต่อคุณไม่ได้ โปรดกลับมาดูหน้านี้ด้วยลิงก์ส่วนตัว", en: "You sent this anonymously, so we cannot contact you. Please come back to this page with your private link" },
  cpYouCan: { th: "สิ่งที่คุณทำได้", en: "What you can do" },
  cpSurveyLink: { th: "บอกเราว่าเราทำได้ดีแค่ไหน", en: "Tell us how we did" },
  cpReopenLink: { th: "ขอเปิดเรื่องอีกครั้ง", en: "Ask us to reopen it" },
  cpReopenUntil: { th: "ภายในวันที่ {date}", en: "until {date}" },
  cpWithdrawLink: { th: "ยกเลิกข้อร้องเรียนนี้", en: "Withdraw this complaint" },
  cpForgetNote: { th: "ลบข้อมูลที่จำไว้ในเบราว์เซอร์เครื่องนี้ ลิงก์ส่วนตัวยังใช้ได้อยู่", en: "This clears what this device remembers. Your private link still works" },
  cpForgetThisDevice: { th: "ออกจากหน้านี้บนอุปกรณ์นี้", en: "Forget this complaint on this device" },
  cpWithdrawTitle: { th: "ยกเลิกข้อร้องเรียนนี้หรือไม่", en: "Do you want to withdraw this complaint?" },
  cpWithdrawBody: { th: "เจ้าหน้าที่จะหยุดดำเนินการ ยกเลิกแล้วทำต่อไม่ได้ ถ้ายังต้องการ ต้องส่งเรื่องใหม่", en: "Staff will stop work on it. This cannot be undone. If you change your mind you will need to send a new complaint" },
  cpWithdrawYes: { th: "ใช่ ยกเลิกข้อร้องเรียน", en: "Yes, withdraw the complaint" },
  cpWithdrawNo: { th: "ไม่ กลับไปหน้าความคืบหน้า", en: "No, go back to progress" },
  cpWithdrawFailed: { th: "ยกเลิกไม่สำเร็จ เรื่องอาจเปลี่ยนสถานะไปแล้ว", en: "We could not withdraw it. It may have moved on" },
  cpWithdrawnBanner: { th: "ยกเลิกข้อร้องเรียนแล้ว", en: "Complaint withdrawn" },
  cpWithdrawnBannerBody: { th: "เจ้าหน้าที่จะไม่ดำเนินการต่อ", en: "Staff will not take it further" },
  cpReopenTitle: { th: "ขอเปิดเรื่องอีกครั้ง", en: "Ask us to reopen your complaint" },
  cpReopenBody: { th: "ถ้าคุณคิดว่าเรื่องยังไม่จบ ขอเปิดเรื่องอีกครั้งได้ถึงวันที่ {date}", en: "If you think it is not finished, you can ask us to reopen it until {date}" },
  cpReopenReasonLabel: { th: "อะไรที่ยังไม่ได้รับการแก้ไข", en: "What is still not put right" },
  cpReopenReasonHint: { th: "ไม่บังคับ ไม่เกิน 1,000 ตัวอักษร ข้อความเข้ารหัสไว้", en: "Optional. Up to 1,000 characters. It is encrypted" },
  cpReopenYes: { th: "เปิดเรื่องอีกครั้ง", en: "Reopen my complaint" },
  cpReopenNo: { th: "ไม่ กลับไปหน้าความคืบหน้า", en: "No, go back to progress" },
  cpReopenFailed: { th: "เปิดเรื่องอีกครั้งไม่สำเร็จ อาจพ้นกำหนดแล้ว", en: "We could not reopen it. The time may have passed" },
  cpErrReasonLong: { th: "ข้อความยาวเกิน 1,000 ตัวอักษร", en: "That is over 1,000 characters" },
  cpReopenedBanner: { th: "เปิดเรื่องอีกครั้งแล้ว", en: "Complaint reopened" },
  cpReopenedBannerBody: { th: "เจ้าหน้าที่จะพิจารณาอีกครั้ง ดูเป้าหมายใหม่ได้ด้านล่าง", en: "Staff will look at it again. The new target is below" },
  cpSurveyTitle: { th: "คุณพอใจกับการดำเนินการแค่ไหน", en: "How satisfied are you with how we handled it?" },
  cpSurveyHint: { th: "เลือกหนึ่งข้อ", en: "Choose one" },
  cpScore5: { th: "พอใจมาก", en: "Very satisfied" },
  cpScore4: { th: "พอใจ", en: "Satisfied" },
  cpScore3: { th: "เฉย ๆ", en: "Neither satisfied nor dissatisfied" },
  cpScore2: { th: "ไม่พอใจ", en: "Dissatisfied" },
  cpScore1: { th: "ไม่พอใจมาก", en: "Very dissatisfied" },
  cpCommentLabel: { th: "อยากบอกอะไรเพิ่มไหม", en: "Anything else you want to tell us?" },
  cpCommentHint: { th: "ไม่บังคับ ไม่เกิน 1,000 ตัวอักษร ข้อความเข้ารหัสไว้", en: "Optional. Up to 1,000 characters. It is encrypted" },
  cpSurveySend: { th: "ส่งคำตอบ", en: "Send" },
  cpSurveyThanks: { th: "ขอบคุณที่บอกเรา", en: "Thank you for telling us" },
  cpSurveyFailed: { th: "ส่งคำตอบไม่สำเร็จ ลองอีกครั้ง", en: "We could not save your answer. Try again" },
  cpErrScore: { th: "เลือกคะแนนความพึงพอใจ", en: "Choose how satisfied you are" },
  cpErrCommentLong: { th: "ข้อความยาวเกิน 1,000 ตัวอักษร", en: "That is over 1,000 characters" },
  cpFromReport: { th: "ถ้าไม่ใช่เหตุฉุกเฉินและต้องการร้องเรียนต่อ อมธ. หรือ สภานักศึกษา:", en: "If it is not an emergency and you want to complain about TUSU or TUSC:" },

} as const satisfies Record<string, LocaleString>;

export type UiKey = keyof typeof UI;

/** Reads a shared string in the active language. */
export function t(key: UiKey, locale: Locale): string {
  return UI[key][locale];
}
