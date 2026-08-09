/**
 * Real Tha Prachan information harvested from the existing published sources,
 * used to seed the CMS.
 *
 * WHERE THIS CAME FROM
 *   https://linktr.ee/TUSU_Tha.pra.chaN     TUSU Tha Prachan link tree
 *   https://linktr.ee/tusc.tpc              TUSC Tha Prachan link tree
 *   https://linktr.ee/tpc.contact.info      club and faculty committee directory
 *   https://linktr.ee/tpc.student.welfare   welfare links
 *   https://online.fliphtml5.com/hpjjz/upyn TU91 Handbook, "The Magic of TPC"
 *
 * WHAT THIS IS NOT
 * This is a starting point for editors, not a substitute for them. Anything
 * marked `needsVerification` was read off a scanned page, a link tree label or
 * a search result and has not been confirmed by TUSU or TUSC. Do not present
 * unverified values to students as fact. In particular there is NO shuttle
 * timetable here, because the only published one is an image in an Instagram
 * post and inventing times would be worse than showing none.
 *
 * Harvested 7 August 2026.
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
  {
    key: "wellbeingCenter",
    name: { th: "TU Wellbeing Center", en: "TU Wellbeing Center" },
    url: "https://line.me/R/ti/p/@754xjgcn",
    category: "welfare",
    requiresSignIn: false,
    note: {
      th: "ติดต่อผ่าน LINE Official Account",
      en: "Contact through the LINE official account",
    },
  },
  {
    key: "tuWellBeing",
    name: { th: "TU Well-Being", en: "TU Well-Being" },
    url: "https://line.me/R/ti/p/@460rxhfi",
    category: "welfare",
    requiresSignIn: false,
    note: {
      th: "ติดต่อผ่าน LINE Official Account",
      en: "Contact through the LINE official account",
    },
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
      th: "แบบฟอร์มร้องเรียนและแจ้งเหตุ ท่าพระจันทร์",
      en: "TPC emergency report and complaint form",
    },
    purpose: {
      th: "แจ้งเหตุฉุกเฉินหรือร้องเรียนเรื่องที่เกิดขึ้นในพื้นที่ท่าพระจันทร์",
      en: "Report an emergency or make a complaint about something at Tha Prachan",
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
      "Returns HTTP 401 to an anonymous request. A Google account is required. Verified 7 August 2026.",
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
    destinationType: "googleForm",
    category: "activity",
    owner: "tusu",
    requiresSignIn: true,
    signInType: "google",
    isPriority: true,
    needsVerification: "The exact form URL was not captured. Ask TUSU for the current link.",
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
    title: { th: "สวัสดิการนักศึกษาท่าพระจันทร์", en: "TPC student welfare" },
    url: "https://drive.google.com/file/d/1FdmB1CqVNwH6FZp_x08B3CKfC-4p-MTM/view",
  },
  {
    key: "divisionsContact",
    title: {
      th: "ข้อมูลติดต่อหน่วยงานในท่าพระจันทร์",
      en: "TPC university divisions contact information",
    },
    url: "https://drive.google.com/file/d/1z0dI7GngUZbVRy1KbecpWopyq1JPWbf-/view",
  },
  {
    key: "openData",
    title: { th: "ข้อมูลเปิดของสภานักศึกษา", en: "TUSC open data" },
    url: "https://drive.google.com/drive/folders/1PvLJqanBEvYMNxGO0Kdx9Yd462fou_vM",
  },
  {
    key: "tu91Handbook",
    title: { th: "คู่มือ TU91 The Magic of TPC", en: "TU91 Handbook, The Magic of TPC" },
    url: "https://online.fliphtml5.com/hpjjz/upyn/",
    note: "33 scanned pages, no text layer. Its contents list is the content inventory below.",
  },
  {
    key: "shuttleTimetable",
    title: {
      th: "ตารางจุดรับ-ส่งเส้นทางเดินรถรับส่งท่าพระจันทร์",
      en: "TPC shuttle bus stops and timetable",
    },
    url: "https://www.instagram.com/p/DIEOlffS5dr/",
    note: "Published only as an image in an Instagram post. Must be transcribed by hand before the shuttle panel can show anything.",
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
  { name: "SPD Inter Student Council", handle: "spdstudentc", type: "facultyCommittee", faculty: { th: "คณะสังคมสงเคราะห์ศาสตร์", en: "Faculty of Social Administration" } },

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

/* ------------------------------------------------------------------ *
 * Getting to Tha Prachan
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
    routes: [
      { th: "ท่าพระจันทร์ ถึง เซ็นทรัลปิ่นเกล้า", en: "Tha Prachan to Central Pinklao" },
      { th: "หอพัก ถึง ท่าพระจันทร์", en: "Dormitory to Tha Prachan" },
    ],
    note: {
      th: "ให้บริการวันจันทร์ถึงศุกร์ ไม่ให้บริการวันเสาร์ อาทิตย์ และวันหยุดนักขัตฤกษ์ แสดงบัตรประจำตัวนักศึกษาเมื่อขึ้นรถ",
      en: "Runs Monday to Friday. No service at weekends or on public holidays. Show your student card when boarding",
    },
    needsVerification:
      "Departure times are NOT recorded here. The only published timetable is an image in an Instagram post. Transcribe it with TUSU before the shuttle panel goes live.",
  },
  needsVerification:
    "City bus route numbers appear on the handbook's scanned page but were not legible enough to record reliably. Confirm against a current source.",
} as const;

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
