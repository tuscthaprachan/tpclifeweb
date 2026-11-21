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
    clubsHeading: { th: "ชุมนุมและกลุ่มอิสระ", en: "Clubs and independent groups" },
    otherHeading: { th: "องค์กรนักศึกษาและหน่วยงานมหาวิทยาลัย", en: "Student bodies and university divisions" },
  },
  { th: "รายชื่อหน่วยงานและองค์กรนักศึกษา", en: "Directory of organisations" },
);
