import type { LocaleString } from "@/lib/i18n/config";
import { OPEN_DATA_TEXT } from "../strings";

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
    name: OPEN_DATA_TEXT.fund31Name,
    forWhom: OPEN_DATA_TEXT.fund31ForWhom,
    students: null,
    dateEn: "30 August 2021",
  },
  {
    file: "32",
    code: "40002",
    name: OPEN_DATA_TEXT.fund32Name,
    forWhom: OPEN_DATA_TEXT.fund32ForWhom,
    students: null,
    dateEn: "17 September 2018",
  },
  {
    file: "33",
    code: "43023",
    name: OPEN_DATA_TEXT.fund33Name,
    forWhom: OPEN_DATA_TEXT.fund33ForWhom,
    students: null,
    dateEn: "10 April 2023 (No. 2); 17[?] October 2022 (original)",
  },
  {
    file: "34",
    code: "43050",
    name: OPEN_DATA_TEXT.fund34Name,
    forWhom: OPEN_DATA_TEXT.fund34ForWhom,
    students: OPEN_DATA_TEXT.fund34Students,
    dateEn: "30 August 2021",
  },
  {
    file: "35",
    code: "43112",
    name: OPEN_DATA_TEXT.fund35Name,
    forWhom: OPEN_DATA_TEXT.fund35ForWhom,
    students: null,
    dateEn: "[day illegible] October 2022",
  },
  {
    file: "36",
    code: "43084",
    name: OPEN_DATA_TEXT.fund36Name,
    forWhom: OPEN_DATA_TEXT.fund36ForWhom,
    students: null,
    dateEn: "30 August 2021",
  },
  {
    file: "37",
    code: "43131",
    name: OPEN_DATA_TEXT.fund37Name,
    forWhom: OPEN_DATA_TEXT.fund37ForWhom,
    students: null,
    dateEn: "30 August 2021",
  },
  {
    file: "38",
    code: "43145",
    name: OPEN_DATA_TEXT.fund38Name,
    forWhom: OPEN_DATA_TEXT.fund38ForWhom,
    students: OPEN_DATA_TEXT.fund38Students,
    dateEn: "30 August 2021",
  },
];

/** The code as the table prints it: the list marks one attachment number as doubtful. */
export function printedCode(fund: RegulatedFund): string {
  return fund.file === "37" ? `${fund.code} [?]` : fund.code;
}
