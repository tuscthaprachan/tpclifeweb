/**
 * Real Thammasat Tha Prachan information harvested from the existing published sources,
 * used to seed the CMS.
 *
 * WHERE THIS CAME FROM
 *   https://linktr.ee/TUSU_Tha.pra.chaN     TUSU Tha Prachan link tree
 *   https://linktr.ee/tusc.tpc              TUSC Tha Prachan link tree
 *   https://linktr.ee/tpc.contact.info      club and faculty committee directory
 *   https://linktr.ee/tpc.student.welfare   welfare links
 *   https://online.fliphtml5.com/hpjjz/upyn TU91 Handbook, "The Magic of TPC"
 *   Two official shuttle timetable graphics supplied directly by the site
 *     owner on 16 August 2026 (Sanam Chai Line and Pinklao Line). These are
 *     not a link tree or a scan; they are the first structured timetable this
 *     file has ever held. See SHUTTLE_ROUTES below for what was, and was not,
 *     on them.
 *
 * WHAT THIS IS NOT
 * This is a starting point for editors, not a substitute for them. Anything
 * marked `needsVerification` was read off a scanned page, a link tree label,
 * a search result or a timetable graphic and has not been confirmed by TUSU
 * or TUSC beyond what is stated. Do not present unverified values to students
 * as fact.
 *
 * The shuttle timetable graphics gave real, official departure times, so
 * SHUTTLE_ROUTES below is genuine structured data, not an invention. What
 * they did NOT give: the travel time between one stop and the next (so every
 * stop's offset is recorded as unknown, not guessed), and which term or
 * academic year the timetable applies to (so that is flagged too). See
 * SHUTTLE_ROUTES' own comment for the full account.
 *
 * Harvested 7 August 2026. Shuttle timetables added 16 August 2026.
 */

/* ------------------------------------------------------------------ *
 * External services and tools
 * ------------------------------------------------------------------ */

export const EXTERNAL_SERVICES = [
  {
    key: "roomBooking",
    name: {
      th: "จองห้องกิจกรรมนักศึกษาและโรงยิม",
      en: "Student activity room and gym booking",
    },
    url: "https://sa.tu.ac.th/oth/SATU_booking/MENU_booking",
    category: "activity",
    requiresSignIn: true,
    note: {
      th: "ระบบมีปฏิทินการจอง ตารางการใช้ห้อง แบบฟอร์มขอใช้สถานที่ ระเบียบการจอง และคู่มือการใช้งาน",
      en: "The system has a booking calendar, a room schedule, a facility request form, booking rules and a user manual",
    },
  },
  {
    key: "traffyFondue",
    name: {
      th: "Traffy Fondue มธ. ท่าพระจันทร์",
      en: "Traffy Fondue, Thammasat Tha Prachan",
    },
    url: "https://landing.traffy.in.th/?key=FTkgepwk",
    category: "governance",
    requiresSignIn: false,
    note: {
      th: "แจ้งปัญหาสภาพแวดล้อมและสิ่งอำนวยความสะดวกภายในมหาวิทยาลัย",
      en: "Report faults with campus facilities and the physical environment",
    },
  },
  // wellbeingCenter and tuWellBeing carry two different LINE Official
  // Account IDs (@754xjgcn and @460rxhfi) under two near-identical English
  // names, one read off the TUSC linktree and the other off the TUSU
  // welfare sub-linktree. Independent research on 16 August 2026 confirms
  // both IDs are real and distinct, but whether they are one service
  // advertised twice or genuinely two services remains unresolved. Kept as
  // two separate entries rather than merged; see the shared
  // `needsVerification` note on each.
  {
    key: "wellbeingCenter",
    name: { th: "TU Wellbeing Center", en: "TU Wellbeing Center" },
    url: "https://line.me/R/ti/p/@754xjgcn",
    category: "welfare",
    requiresSignIn: false,
    note: {
      th: "ติดต่อผ่าน LINE Official Account จากลิงก์ทรีของสภานักศึกษา ท่าพระจันทร์",
      en: "Contact through the LINE official account, from the TUSC Tha Prachan linktree",
    },
    needsVerification:
      "May be the same wellbeing service as tuWellBeing (@460rxhfi) advertised under a slightly different name by " +
      "TUSC rather than TUSU, or a genuinely different service. Not merged with it. Ask TUSU and TUSC to confirm.",
  },
  {
    key: "tuWellBeing",
    name: { th: "TU Well-Being", en: "TU Well-Being" },
    url: "https://line.me/R/ti/p/@460rxhfi",
    category: "welfare",
    requiresSignIn: false,
    note: {
      th: "ติดต่อผ่าน LINE Official Account จากลิงก์ทรีสวัสดิการนักศึกษาของ อมธ. ท่าพระจันทร์",
      en: "Contact through the LINE official account, from the TUSU Tha Prachan student welfare sub-linktree",
    },
    needsVerification:
      "May be the same wellbeing service as wellbeingCenter (@754xjgcn) advertised under a slightly different name " +
      "by TUSU rather than TUSC, or a genuinely different service. Not merged with it. Ask TUSU and TUSC to confirm.",
  },
  {
    key: "library",
    name: { th: "หอสมุดมหาวิทยาลัยธรรมศาสตร์", en: "Thammasat University Library" },
    url: "https://www.library.tu.ac.th",
    category: "welfare",
    requiresSignIn: false,
  },
  {
    key: "libraryBooking",
    name: {
      th: "จองห้องค้นคว้าและพื้นที่นั่งทำงานของหอสมุด",
      en: "Library study room and co-working booking",
    },
    url: "https://booking.library.tu.ac.th/login",
    category: "welfare",
    requiresSignIn: true,
  },
] as const;

/* ------------------------------------------------------------------ *
 * Forms
 *
 * Both existing forms are Google Forms behind a sign-in. The emergency report
 * form returns HTTP 401 to an anonymous request, verified 7 August 2026. That
 * fact is the single most useful thing this site can tell a student before
 * they click, so it is recorded here explicitly.
 * ------------------------------------------------------------------ */

export const FORMS = [
  {
    key: "emergencyReport",
    title: {
      th: "แบบฟอร์มร้องเรียนและแจ้งเหตุ ธรรมศาสตร์ท่าพระจันทร์",
      en: "TPC emergency report and complaint form",
    },
    purpose: {
      th: "แจ้งเหตุฉุกเฉินหรือร้องเรียนเรื่องที่เกิดขึ้นในพื้นที่ธรรมศาสตร์ท่าพระจันทร์",
      en: "Report an emergency or make a complaint about something at Thammasat Tha Prachan",
    },
    destinationUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSfDhKDWjdMJnCid_EpwQBwcuxyylXGm4qDGSMYcLiW8by9jvA/viewform",
    destinationType: "googleForm",
    category: "governance",
    owner: "tusc",
    requiresSignIn: true,
    signInType: "google",
    isPriority: true,
    verifiedNote:
      "Returns HTTP 401 to an anonymous request. A Google account is required. Verified 7 August 2026, confirmed again independently 16 August 2026.",
    needsVerification:
      "TUSU's own linktree (linktr.ee/TUSU_Tha.pra.chaN) links to the same form ID but at the /formResponse path " +
      "(a submission endpoint, not the normal entry page) rather than /viewform, which is what TUSC's linktree and " +
      "this destinationUrl use. /viewform was kept here because it is the normal way to open a Google Form. Ask " +
      "TUSU whether their linktree's /formResponse link is a mistake.",
  },
  {
    key: "equipmentRequest",
    title: {
      th: "แบบฟอร์มขอใช้อุปกรณ์",
      en: "Equipment request form",
    },
    purpose: {
      th: "ขอยืมอุปกรณ์กิจกรรมจาก อมธ. ท่าพระจันทร์",
      en: "Borrow activity equipment from TUSU Tha Prachan",
    },
    destinationUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSeC78lQvgJMjLq5IeQ_cl1kwrPaf6G2JtNMCBqW3JUCSejIfw/viewform",
    destinationType: "googleForm",
    category: "activity",
    owner: "tusu",
    requiresSignIn: true,
    signInType: "google",
    isPriority: true,
    needsVerification:
      "URL captured 16 August 2026 from TUSU's linktree (linktr.ee/TUSU_Tha.pra.chaN). Unlike the emergency report " +
      "form, nobody has actually tested that this form rejects an anonymous request; requiresSignIn and signInType " +
      "are carried over from the previous entry, not independently confirmed against this specific form.",
  },
] as const;

/* ------------------------------------------------------------------ *
 * Documents worth transcribing into the CMS
 *
 * All of these are currently PDFs or Drive files. Each is unsearchable and
 * inaccessible in its present form, which is the reason for re-authoring.
 * ------------------------------------------------------------------ */

export const SOURCE_DOCUMENTS = [
  {
    key: "studentActivityRegulation",
    title: {
      th: "ข้อบังคับมหาวิทยาลัยธรรมศาสตร์ ว่าด้วยกิจกรรมนักศึกษา พ.ศ. 2563",
      en: "Thammasat University regulation on student activities, B.E. 2563 (2020)",
    },
    url: "http://sa.tu.ac.th/oth/TUrules/TUrules63.pdf",
    note: "Establishes TUSU, TUSC, faculty student committees, clubs and independent groups, and governs budget and approval.",
  },
  {
    key: "vehicleAccessRules",
    title: {
      th: "หลักเกณฑ์รถเข้า-ออกในมหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ และค่าปรับ",
      en: "Vehicle access rules and fines, Thammasat Tha Prachan",
    },
    url: "https://drive.google.com/file/d/15hz7kow4vcLpBq9rQwVzob7qd1tq78YU/view",
  },
  {
    key: "studentWelfare",
    title: { th: "สวัสดิการนักศึกษาธรรมศาสตร์ท่าพระจันทร์", en: "TPC student welfare" },
    url: "https://drive.google.com/file/d/1FdmB1CqVNwH6FZp_x08B3CKfC-4p-MTM/view",
  },
  {
    key: "divisionsContact",
    title: {
      th: "ข้อมูลติดต่อหน่วยงานในธรรมศาสตร์ท่าพระจันทร์",
      en: "TPC university divisions contact information",
    },
    url: "https://drive.google.com/file/d/1z0dI7GngUZbVRy1KbecpWopyq1JPWbf-/view",
    note: "The Drive file itself is titled \"contract infomation.pdf\" (sic, both words), not a transcription error made here.",
  },
  {
    key: "openData",
    title: { th: "ข้อมูลเปิดของสภานักศึกษา", en: "TUSC open data" },
    url: "https://drive.google.com/drive/folders/1PvLJqanBEvYMNxGO0Kdx9Yd462fou_vM",
    note: "The Drive folder is named \"OPEN DATA 2025\".",
  },
  {
    key: "tu91Handbook",
    title: { th: "คู่มือ TU91 The Magic of TPC", en: "TU91 Handbook, The Magic of TPC" },
    url: "https://online.fliphtml5.com/hpjjz/upyn/",
    note:
      "33 scanned pages, no text layer, confirmed again 16 August 2026: the pages are rendered as image tiles, so " +
      "the handbook is not searchable and its content cannot be extracted without OCR. This is the exact " +
      "accessibility failure this site exists to fix; its content is not available through this site until someone " +
      "does that work. Its contents list is the content inventory below.",
  },
  {
    key: "shuttleTimetable",
    title: {
      th: "ตารางจุดรับ-ส่งเส้นทางเดินรถรับส่งธรรมศาสตร์ท่าพระจันทร์",
      en: "TPC shuttle bus stops and timetable",
    },
    url: "https://www.instagram.com/p/DIEOlffS5dr/",
    note:
      "This Instagram post is a THIRD, older shuttle source, distinct from the two official timetable graphics " +
      "transcribed into SHUTTLE_ROUTES below on 16 August 2026. It has not been cross-checked against those " +
      "graphics and may show different stops, times or routes. Kept here as a reference link, not as the source of " +
      "the seeded timetable.",
  },
] as const;

/**
 * Sections of the TU91 handbook to re-author as native bilingual content.
 * Read off the handbook's own contents page.
 */
export const HANDBOOK_SECTIONS = [
  "Our TPC",
  "TUSU TPC",
  "TUSC TPC",
  "Forms",
  "Student welfare",
  "TPC shuttle bus",
  "How to get to TPC",
  "Nearby TPC",
  "TU-GET",
  "TU Library",
  "Traffy Fondue",
  "Q and A",
] as const;

/* ------------------------------------------------------------------ *
 * Directory
 *
 * 23 organisations, every one with a verified Instagram handle. Faculty names
 * are given in both languages as printed on the source.
 * ------------------------------------------------------------------ */

export const ORGANISATIONS = [
  // Faculty of Liberal Arts
  { name: "Liberal Arts Student Council Tha Prachan", handle: "basictpc", type: "facultyCommittee", faculty: { th: "คณะศิลปศาสตร์", en: "Faculty of Liberal Arts" } },
  { name: "British and American Studies", handle: "basthammasat", type: "facultyCommittee", faculty: { th: "คณะศิลปศาสตร์", en: "Faculty of Liberal Arts" } },
  { name: "Business Communication Committee of Thammasat University", handle: "bctu.committee", type: "facultyCommittee", faculty: { th: "คณะศิลปศาสตร์", en: "Faculty of Liberal Arts" } },
  { name: "BTi Student Association", handle: "btithammasat", type: "facultyCommittee", faculty: { th: "คณะศิลปศาสตร์", en: "Faculty of Liberal Arts" } },
  { name: "RES TU", handle: "res.tu.official", type: "facultyCommittee", faculty: { th: "คณะศิลปศาสตร์", en: "Faculty of Liberal Arts" } },
  { name: "SEAS Thammasat", handle: "seasthammasat", type: "facultyCommittee", faculty: { th: "คณะศิลปศาสตร์", en: "Faculty of Liberal Arts" } },

  // Faculty of Commerce and Accountancy
  { name: "IBMP TU", handle: "ibmp.studentpage", type: "facultyCommittee", faculty: { th: "คณะพาณิชยศาสตร์และการบัญชี", en: "Faculty of Commerce and Accountancy" } },
  { name: "BBA TU", handle: "bba.thammasat", type: "facultyCommittee", faculty: { th: "คณะพาณิชยศาสตร์และการบัญชี", en: "Faculty of Commerce and Accountancy" } },

  // Faculty of Economics
  { name: "BE Student Council", handle: "scobe.thammasat", type: "facultyCommittee", faculty: { th: "คณะเศรษฐศาสตร์", en: "Faculty of Economics" } },

  // Faculty of Political Science
  { name: "BIR Student Association", handle: "student_birsa", type: "facultyCommittee", faculty: { th: "คณะรัฐศาสตร์", en: "Faculty of Political Science" } },

  // Faculty of Law
  { name: "LL.B. Student Committee", handle: "llbthammasat_sc", type: "facultyCommittee", faculty: { th: "คณะนิติศาสตร์", en: "Faculty of Law" } },

  // Faculty of Social Administration
  //
  // The Thai faculty name below is spelled exactly as it appears as a
  // section header on linktr.ee/tpc.contact.info: "คณะสังคมสงเคราะห์ศาษตร์".
  // The correct spelling of the word "ศาสตร์" (field of study) has ส before
  // ต; the source page has ษ instead, which is very likely an unintentional
  // typo on the faculty's own committee's page, not a different word. It is
  // kept verbatim rather than silently corrected; see FACULTY_NAME_SPELLING
  // below and the console summary this seed prints.
  { name: "SPD Inter Student Council", handle: "spdstudentc", type: "facultyCommittee", faculty: { th: "คณะสังคมสงเคราะห์ศาษตร์", en: "Faculty of Social Administration" } },

  // Faculty of Journalism and Mass Communication
  { name: "BJM TPC Student Council", handle: "bjm.tpc", type: "facultyCommittee", faculty: { th: "คณะวารสารศาสตร์และสื่อสารมวลชน", en: "Faculty of Journalism and Mass Communication" } },

  // Colleges
  { name: "CITU Student Committee", handle: "citu_sc", type: "facultyCommittee", faculty: { th: "วิทยาลัยนวัตกรรม", en: "College of Innovation" } },
  { name: "CISTU TPC Student Committee", handle: "thaprachanppe", type: "facultyCommittee", faculty: { th: "วิทยาลัยสหวิทยาการ", en: "College of Interdisciplinary Studies" } },
  { name: "PBIC", handle: "pbic.sctu", type: "facultyCommittee", faculty: { th: "วิทยาลัยนานาชาติปรีดี พนมยงค์", en: "Pridi Banomyong International College" } },

  // Clubs and independent groups
  { name: "TPC Film Club", handle: "tpc.filmclub", type: "club" },
  { name: "TPC Allstar", handle: "tpcbasket", type: "club" },
  { name: "TU Host", handle: "tuhost_official", type: "club" },
  { name: "Firebrick.TPC Dance", handle: "firebrick.tpcdance", type: "club" },
  { name: "TPC Music", handle: "tpc.music", type: "club" },
  { name: "ASA TPC", handle: "asa.tpc", type: "independentGroup", nameTh: "ชุมนุมอาสาท่าพระจันทร์" },

  // The two student bodies themselves
  { name: "TUSU Tha Prachan", handle: "tusu.tpc", type: "studentBody", nameTh: "องค์การนักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์" },
] as const;

/**
 * See the comment above the SPD Inter Student Council entry in ORGANISATIONS.
 * Printed in the seed script's end-of-run summary so a human sees it without
 * having to read this file.
 */
export const FACULTY_NAME_SPELLING_NOTE =
  "The Faculty of Social Administration's Thai name is recorded verbatim as \"คณะสังคมสงเคราะห์ศาษตร์\", " +
  "spelled exactly as printed on linktr.ee/tpc.contact.info. The standard spelling ends \"ศาสตร์\", not \"ศาษตร์\". " +
  "Ask the faculty committee which spelling they actually want before treating this as a typo to fix.";

/* ------------------------------------------------------------------ *
 * Getting to Thammasat Tha Prachan
 *
 * From the handbook's "How to go to TU TPC" page and the university's own
 * published information. Bus route numbers were read off a scanned page, so
 * they must be confirmed against a current source before publishing.
 * ------------------------------------------------------------------ */

export const TRANSPORT = {
  mrt: {
    line: { th: "MRT สายสีน้ำเงิน", en: "MRT Blue Line" },
    station: { th: "สถานีสนามไชย", en: "Sanam Chai station" },
  },
  boat: {
    note: {
      th: "เรือด่วนเจ้าพระยา ลงท่าพระจันทร์หรือท่าช้าง",
      en: "Chao Phraya express boat, alight at Tha Prachan or Tha Chang pier",
    },
  },
  shuttle: {
    // These two names match SHUTTLE_ROUTES below, which is now the real,
    // structured source for stops and departure times. This list stays a
    // plain array of route names (rather than being replaced by
    // SHUTTLE_ROUTES) only because app/[locale]/getting-around/page.tsx
    // already reads TRANSPORT.shuttle.routes in this exact shape; that page
    // is outside this agent's owned directories, so its shape is kept
    // rather than changed here.
    routes: [
      { th: "รถเวียนสายสนามไชย", en: "Sanam Chai Line" },
      { th: "รถเวียนสายปิ่นเกล้า", en: "Pinklao Line" },
    ],
    note: {
      th: "ให้บริการวันจันทร์ถึงศุกร์ ไม่ให้บริการวันเสาร์ อาทิตย์ และวันหยุดนักขัตฤกษ์ ดูตารางเวลาและจุดจอดแต่ละเส้นทางได้ที่หน้ารถรับส่ง",
      en: "Runs Monday to Friday. No service at weekends or public holidays. See the shuttle page for each route's timetable and stops",
    },
    needsVerification:
      "Two official timetable graphics were transcribed 16 August 2026 into SHUTTLE_ROUTES; see that export's own " +
      "comment for exactly what is and is not confirmed (per-stop travel time and the term/academic year the " +
      "timetable applies to are both unknown). The 'show your student card when boarding' instruction, present on " +
      "the old placeholder note above, was NOT on either timetable graphic and has been dropped rather than carried " +
      "forward unverified; confirm with TUSU whether it still applies.",
  },
  needsVerification:
    "City bus route numbers appear on the handbook's scanned page but were not legible enough to record reliably. Confirm against a current source.",
} as const;

/* ------------------------------------------------------------------ *
 * Shuttle timetables
 *
 * Transcribed by hand from two official timetable graphics the site owner
 * supplied on 16 August 2026, one per route. This is the first genuine,
 * structured shuttle timetable this file has held; everything in
 * `departures` below is read directly off those graphics, not invented,
 * interpolated or estimated.
 *
 * WHAT THE GRAPHICS DID NOT GIVE, AND WHAT WAS DONE ABOUT IT
 *   - Per-stop travel time. Neither graphic publishes how long it takes to
 *     reach any stop after the one the shuttle departs from; only departure
 *     times from Thammasat University Tha Prachan are published. Inventing
 *     a plausible-sounding "5 minutes to the next stop" would be exactly the
 *     kind of fabrication CONTRIBUTING.md's Honesty section forbids, so
 *     every stop below is `offsetMinutes: 0` and every route's `notes` says
 *     plainly, in both languages, that this is a placeholder and not a
 *     measured time. A future editor who times the route by hand can update
 *     `offsetMinutes` per stop without changing anything else about the
 *     document shape.
 *   - Which term or academic year the timetable applies to. Neither graphic
 *     is dated. A stale timetable silently served to students as current is
 *     the single worst failure mode for a service like this, so
 *     `needsVerification` below says so explicitly, and the same caveat is
 *     repeated in each route's own `notes` field so it is visible to
 *     whoever reads the record in the admin console or, until an editor commits
 *     to a term, to a student reading the site itself.
 *
 * The Pinklao Line timetable graphic also marks four specific departures as
 * dormitory shuttle services (see `dormitoryDepartures` on that route). This
 * is real, published information a student needs, not a note about the data;
 * see the seed script for where it ends up, since neither `shuttleStop.note`
 * (a stop, not a departure time) nor a field of its own exists for a
 * per-departure tag in the shuttle tables.
 * ------------------------------------------------------------------ */

interface ShuttleRouteSourceStop {
  name: { th: string; en: string };
}

interface DormitoryDeparture {
  time: string;
  note: { th: string; en: string };
}

interface ShuttleRouteSource {
  key: string;
  name: { th: string; en: string };
  description: { th: string; en: string };
  stops: ShuttleRouteSourceStop[];
  daysOfWeek: number[];
  departures: string[];
  lastBus: string;
  dormitoryDepartures?: DormitoryDeparture[];
}

// The plain-language notes about unpublished per-stop offsets, the last bus
// and the unknown term (referenced in the file comment above) are assembled
// in lib/db/seed/shuttle.ts, next to the other seeding logic, rather
// than duplicated here. This file holds the raw harvested facts (the routes,
// stops and departure times below); how they become a document's fields is
// the seed script's job, matching every other export in this file.

export const SHUTTLE_ROUTES: ShuttleRouteSource[] = [
  {
    key: "sanamChai",
    name: { th: "รถเวียนสายสนามไชย", en: "Sanam Chai Line" },
    description: {
      th: "รถเวียนสองจุดจอดระหว่างมหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ กับสถานีรถไฟฟ้ามหานครสนามไชย ทางออกมิวเซียมสยาม",
      en: "A two-stop shuttle between Thammasat University Tha Prachan and MRT Sanam Chai Station, Museum Siam Exit.",
    },
    stops: [
      { name: { th: "มหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์", en: "Thammasat University Tha Prachan" } },
      { name: { th: "สถานีสนามไชย (ทางออกมิวเซียมสยาม)", en: "MRT Sanam Chai Station (Museum Siam Exit)" } },
    ],
    daysOfWeek: [1, 2, 3, 4, 5],
    departures: [
      "07:45",
      "08:00", "08:15", "08:30", "08:45",
      "09:00", "09:30", "09:45",
      "10:00",
      "12:00", "12:15", "12:30", "12:45",
      "13:00", "13:15", "13:30",
      "14:00",
      "15:00",
      "16:00", "16:15", "16:30", "16:45",
      "17:00", "17:15", "17:30", "17:45",
      "18:00", "18:15", "18:30",
      "19:00",
      "20:00", "20:30", "20:45",
      "21:00", "21:30",
    ],
    lastBus: "21:30",
  },
  {
    key: "pinklao",
    name: { th: "รถเวียนสายปิ่นเกล้า", en: "Pinklao Line" },
    description: {
      th: "รถเวียนวนรอบระหว่างมหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์ กับย่านปิ่นเกล้า ผ่านจุดจอด 8 จุด แล้ววนกลับมาที่ต้นทาง",
      en: "A loop shuttle between Thammasat University Tha Prachan and the Pinklao area, through 8 stops, then back to the origin to complete the loop.",
    },
    stops: [
      { name: { th: "มหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์", en: "Thammasat University Tha Prachan" } },
      { name: { th: "ก่อนสะพานปิ่นเกล้า", en: "Before Pinklao Bridge" } },
      { name: { th: "พาต้าปิ่นเกล้า", en: "Pata Pinklao" } },
      { name: { th: "เมเจอร์ปิ่นเกล้า", en: "Major Pinklao" } },
      { name: { th: "ลุมพินีพาร์ค ปิ่นเกล้า", en: "Lumphini Park Pinklao" } },
      { name: { th: "ลุมพินีเพลส ปิ่นเกล้า 2", en: "Lumphini Place Pinklao 2" } },
      { name: { th: "เซ็นทรัลปิ่นเกล้า", en: "Central Pinklao" } },
      { name: { th: "ตรงข้ามพาต้าปิ่นเกล้า", en: "Opposite Pata Pinklao" } },
      { name: { th: "หลังสะพานปิ่นเกล้า", en: "After Pinklao Bridge" } },
    ],
    daysOfWeek: [1, 2, 3, 4, 5],
    departures: [
      "07:00", "07:20", "07:40",
      "08:00", "08:20", "08:40",
      "09:00", "09:30",
      "11:00", "11:30",
      "12:00", "12:30",
      "13:00", "13:30",
      "14:00", "14:30",
      "16:00", "16:20", "16:40",
      "17:00", "17:20", "17:40",
      "18:00", "18:30",
      "19:00", "19:30",
      "20:00", "20:30",
      "21:00", "21:30",
    ],
    lastBus: "21:30",
    dormitoryDepartures: [
      {
        time: "07:00",
        note: { th: "บริการหอใน ขาเข้ารอบเช้า", en: "Morning TPC dormitory service" },
      },
      {
        time: "09:00",
        note: { th: "บริการหอใน ขาเข้ารอบเช้า", en: "Morning TPC dormitory service" },
      },
      {
        time: "17:00",
        note: { th: "บริการหอใน ขาออกรอบเย็น", en: "Evening TPC dormitory service" },
      },
      {
        time: "19:00",
        note: { th: "บริการหอใน ขาออกรอบเย็น", en: "Evening TPC dormitory service" },
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * The two bodies
 * ------------------------------------------------------------------ */

export const STUDENT_BODIES = {
  tusu: {
    name: {
      th: "องค์การนักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์",
      en: "Thammasat University Student Union, Tha Prachan",
    },
    established: 1952,
    role: {
      th: "ฝ่ายบริหาร ดูแลการจัดสรรงบประมาณให้ชุมนุมและกลุ่มอิสระ จัดกิจกรรมระดับมหาวิทยาลัย ดูแลสวัสดิการนักศึกษา และเป็นตัวแทนนักศึกษาต่อผู้บริหารมหาวิทยาลัย",
      en: "The executive body. It allocates budget to clubs and independent groups, runs university-wide activities, operates student welfare services, and represents students to university executives",
    },
    instagram: "tusu.tpc",
    linktree: "https://linktr.ee/TUSU_Tha.pra.chaN",
  },
  tusc: {
    name: {
      th: "สภานักศึกษามหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์",
      en: "Thammasat University Student Council, Tha Prachan",
    },
    established: 1970,
    role: {
      th: "ฝ่ายนิติบัญญัติและตรวจสอบ พิจารณาและอนุมัติระเบียบว่าด้วยกิจกรรมนักศึกษา ตรวจสอบการดำเนินงาน นโยบาย และงบประมาณขององค์การนักศึกษา และเผยแพร่ข้อมูลเปิด",
      en: "The legislative and scrutiny body. It drafts and approves rules on student activities, scrutinises the Union's decisions, policies and budget, and publishes open data",
    },
    instagram: "tusc.tpc",
    facebook: "tusc.tpc",
    email: "tusc.thaprachan@gmail.com",
    linktree: "https://linktr.ee/tusc.tpc",
  },
  governedBy: {
    th: "ข้อบังคับมหาวิทยาลัยธรรมศาสตร์ ว่าด้วยกิจกรรมนักศึกษา พ.ศ. 2563",
    en: "Thammasat University regulation on student activities, B.E. 2563 (2020)",
  },
  campusReform: {
    note: "Since 2020 each Thammasat campus has had its own elected student council covering campus-specific affairs.",
  },
} as const;
