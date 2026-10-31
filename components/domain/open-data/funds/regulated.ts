import type { LocaleString } from "@/lib/i18n/config";

export interface RegulatedFund {
  /** The number of the source file that holds the regulation. */
  file: string;
  code: string;
  name: LocaleString;
  forWhom: LocaleString;
  /** Whether students sit on the fund's committee, with who where they do. Null when they do not. */
  students: LocaleString | null;
  /** The date as printed, in English. Thai shows the date as the document prints it. */
  dateEn: string;
}

/** The 8 funds whose regulations the council keeps (files 31 to 38), matched to the list of funds by code. */
export const REGULATED_FUNDS: readonly RegulatedFund[] = [
  {
    file: "31",
    code: "40001",
    name: { th: "กองทุนค่าธรรมเนียมการศึกษาเพื่อการพัฒนามหาวิทยาลัย", en: "Tuition Fee for University Development Fund" },
    forWhom: { th: "คณะและหน่วยงานของมหาวิทยาลัย (นักศึกษาได้ประโยชน์ทางอ้อม)", en: "Faculties and university units (students benefit indirectly)" },
    students: null,
    dateEn: "30 August 2021",
  },
  {
    file: "32",
    code: "40002",
    name: { th: "ทุนวิจัยมหาวิทยาลัยธรรมศาสตร์", en: "Research Fund" },
    forWhom: { th: "อาจารย์ นักวิจัย และบุคลากรอื่นของมหาวิทยาลัย", en: "Lecturers, researchers and other university staff" },
    students: null,
    dateEn: "17 September 2018",
  },
  {
    file: "33",
    code: "43023",
    name: { th: "กองทุนเพื่อเสริมสร้างความเป็นนานาชาติ", en: "Internationalisation Fund" },
    forWhom: { th: "นักศึกษาแลกเปลี่ยนและหน่วยงานของมหาวิทยาลัย", en: "Exchange students and university units" },
    students: null,
    dateEn: "10 April 2023 (No. 2); 17[?] October 2022 (original)",
  },
  {
    file: "34",
    code: "43050",
    name: { th: "ทุนบริหารโครงการประกันอุบัติเหตุนักศึกษา", en: "Accident Insurance Support Fund" },
    forWhom: { th: "นักศึกษาและบุคลากรที่มีประกันอุบัติเหตุ", en: "Students and staff who have accident insurance" },
    students: {
      th: "มี: หัวหน้าองค์การนักศึกษาและประธานสภานักศึกษา (หรือผู้แทน)",
      en: "Yes: the head of the Student Union and the chair of the Student Council (or their representatives)",
    },
    dateEn: "30 August 2021",
  },
  {
    file: "35",
    code: "43112",
    name: { th: "กองทุนสำหรับนักศึกษาที่มีความจำเป็นทางการเงิน", en: "Fund for Students in Financial Need" },
    forWhom: { th: "นักศึกษา", en: "Students" },
    students: null,
    dateEn: "[day illegible] October 2022",
  },
  {
    file: "36",
    code: "43084",
    name: { th: "กองทุนเพิ่มพูนความรู้ในต่างประเทศ", en: "Fund to Enhance Knowledge Abroad" },
    forWhom: { th: "บุคลากรของมหาวิทยาลัย (นักศึกษาไม่มีสิทธิ์)", en: "University staff (students are not eligible)" },
    students: null,
    dateEn: "30 August 2021",
  },
  {
    file: "37",
    code: "43131",
    name: { th: "กองทุนการศึกษาระดับบัณฑิตศึกษา มธ.", en: "Graduate Education Fund" },
    forWhom: { th: "นักศึกษาระดับบัณฑิตศึกษา", en: "Graduate students" },
    students: null,
    dateEn: "30 August 2021",
  },
  {
    file: "38",
    code: "43145",
    name: { th: "กองทุนเงินอุดหนุนกิจกรรมนักศึกษา", en: "Student Activities Subsidy Fund" },
    forWhom: { th: "โครงการขององค์การนักศึกษา (TUSU)", en: "Projects of the Student Union (TUSU)" },
    students: {
      th: "มี: ผู้แทนองค์การนักศึกษา 2 คน และผู้แทนสภานักศึกษา 1 คน",
      en: "Yes: 2 Student Union representatives and 1 Student Council representative",
    },
    dateEn: "30 August 2021",
  },
];

/** The code as the table prints it: the list marks one attachment number as doubtful. */
export function printedCode(fund: RegulatedFund): string {
  return fund.file === "37" ? `${fund.code} [?]` : fund.code;
}
