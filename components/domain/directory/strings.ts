import { editableStrings } from "@/lib/i18n/editable";

export const DIRECTORY_TEXT = editableStrings(
  "domain-directory",
  {
    typeLabel: { th: "ประเภทหน่วยงาน", en: "Organisation type" },
    facultyLabel: { th: "คณะ", en: "Faculty" },
    typeFacultyCommittee: { th: "คณะกรรมการนักศึกษาคณะ", en: "Faculty committee" },
    typeClub: { th: "ชุมนุม", en: "Club" },
    typeIndependentGroup: { th: "กลุ่มอิสระ", en: "Independent group" },
    typeUniversityDivision: { th: "หน่วยงานมหาวิทยาลัย", en: "University division" },
    typeStudentBody: { th: "องค์กรนักศึกษา", en: "Student body" },
    searchLabel: { th: "ค้นหาชื่อหน่วยงาน", en: "Search by name" },
    searchHint: { th: "พิมพ์ชื่อเป็นภาษาไทยหรือภาษาอังกฤษ แล้วกด Enter", en: "Type a name in Thai or English, then press Enter" },
    resultCountOne: { th: "พบ 1 หน่วยงาน", en: "1 organisation" },
    resultCountMany: { th: "พบ {n} หน่วยงาน", en: "{n} organisations" },
    jumpToLabel: { th: "ข้ามไปยังหมวด", en: "Jump to section" },
    noMatchHint: { th: "ลองใช้คำค้นอื่นหรือล้างตัวกรอง", en: "Try a different search or clear the filters." },
    metaDescription: {
      th: "รายชื่อคณะกรรมการนักศึกษา ชุมนุม กลุ่มอิสระ และหน่วยงานมหาวิทยาลัย พร้อมช่องทางติดต่อ",
      en: "Student committees, clubs, independent groups and university divisions at Thammasat Tha Prachan, with ways to contact them.",
    },
    clubsHeading: { th: "ชุมนุมและกลุ่มอิสระ", en: "Clubs and independent groups" },
    otherHeading: { th: "องค์กรนักศึกษาและหน่วยงานมหาวิทยาลัย", en: "Student bodies and university divisions" },
  },
  { th: "รายชื่อหน่วยงานและองค์กรนักศึกษา", en: "Directory of organisations" },
);
