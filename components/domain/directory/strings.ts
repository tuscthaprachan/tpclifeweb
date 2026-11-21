import { editableStrings } from "@/lib/i18n/editable";

export const DIRECTORY_TEXT = editableStrings(
  "domain-directory",
  {
    typeLabel: { th: "ประเภทหน่วยงาน", en: "Organisation type" },
    facultyLabel: { th: "คณะ", en: "Faculty" },
    typeFacultyCommittee: { th: "คณะกรรมการนักศึกษาคณะ", en: "Faculty student committee" },
    typeClub: { th: "ชุมนุม", en: "Club" },
    typeIndependentGroup: { th: "กลุ่มอิสระ", en: "Independent group" },
    typeUniversityDivision: { th: "หน่วยงานมหาวิทยาลัย", en: "University division" },
    typeStudentBody: { th: "องค์กรนักศึกษา", en: "Student body" },
    searchLabel: { th: "ค้นหาชื่อหน่วยงาน", en: "Search by name" },
    searchHint: { th: "พิมพ์ชื่อเป็นภาษาไทยหรือภาษาอังกฤษ แล้วกด Enter", en: "Type a name in Thai or English, then press Enter" },
    resultCountOne: { th: "พบ 1 รายการ", en: "1 result" },
    resultCountMany: { th: "พบ {n} รายการ", en: "{n} results" },
    jumpToLabel: { th: "ข้ามไปยังหมวด", en: "Jump to section" },
    noMatchHint: { th: "ลองใช้คำค้นอื่นหรือล้างตัวกรอง", en: "Try a different search or clear the filters." },
    metaDescription: {
      th: "รายชื่อคณะกรรมการนักศึกษา ชุมนุม กลุ่มอิสระ และหน่วยงานมหาวิทยาลัย พร้อมช่องทางติดต่อ",
      en: "Student committees, clubs, independent groups and university divisions at Thammasat Tha Prachan, with ways to contact them.",
    },
    clubsHeading: { th: "ชุมนุมและกลุ่มอิสระ", en: "Clubs and independent groups" },
    studentBodiesHeading: { th: "องค์กรนักศึกษา", en: "Student bodies" },
    divisionsHeading: { th: "หน่วยงานของมหาวิทยาลัย", en: "University offices" },
    audienceStudents: { th: "ดำเนินการโดยนักศึกษา", en: "Run by students" },
    audienceStaff: { th: "เจ้าหน้าที่มหาวิทยาลัย", en: "University staff" },
    officeHeading: { th: "สำนักงานคณะ", en: "Faculty office" },
    officeIntro: {
      th: "เจ้าหน้าที่ของคณะ ติดต่อเรื่องการเรียน ทะเบียน รายวิชา และเอกสารของคณะ",
      en: "The faculty's staff. Contact them about your studies, registration, courses and faculty paperwork.",
    },
    officeNone: { th: "เรายังไม่มีข้อมูลติดต่อสำนักงานนี้", en: "We do not have this office's contact details yet." },
    committeesHeading: { th: "คณะกรรมการนักศึกษา", en: "Student committees" },
    committeesIntro: {
      th: "นักศึกษาที่เป็นตัวแทนของนักศึกษาในคณะและจัดกิจกรรม ไม่ใช่เจ้าหน้าที่ของคณะ",
      en: "Students who represent students in the faculty and run activities. They are not faculty staff.",
    },
    committeesNone: { th: "เรายังไม่มีรายชื่อคณะกรรมการนักศึกษาของคณะนี้", en: "We do not list a student committee for this faculty yet." },
  },
  { th: "รายชื่อหน่วยงานและองค์กรนักศึกษา", en: "Directory of organisations" },
);
