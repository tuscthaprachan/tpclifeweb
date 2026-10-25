/**
 * Fixed numbers for the complaints service. Targets per category live in the
 * database (complaint_categories); these are the rules that apply to all.
 */

/** A person may reopen a resolved complaint for this many days after the resolution. */
export const REOPEN_WINDOW_DAYS = 30;

/** Evidence limits. Each file goes through a Server Action, which Vercel caps at 4.5 MB. */
export const MAX_EVIDENCE_FILES = 3;
export const MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;

/** Field lengths, in characters as a person counts them. */
export const COMPLAINT_LIMITS = { description: 3000, when: 200, where: 300, remedy: 1000, reopenReason: 1000, surveyComment: 1000, name: 100, email: 254, phone: 20, lineId: 40, alias: 100 } as const;

/**
 * Where the TU wellbeing centre can be reached, shown to a person who made a
 * complaint in a category that offers it. Taken from the handbook (the 24 hour
 * line) and the harvested link trees (the two LINE accounts); desks must
 * confirm them before launch, see data/harvested-inventory.ts.
 */
export const WELLBEING_CONTACT = {
  phone: { display: "02-026-2345 (press 2)", tel: "tel:020262345,2" },
  line: [
    { id: "@754xjgcn", url: "https://line.me/R/ti/p/@754xjgcn" },
    { id: "@460rxhfi", url: "https://line.me/R/ti/p/@460rxhfi" },
  ],
} as const;

/** Emergency numbers shown beside the /report route. National numbers, not Thammasat's. */
export const EMERGENCY_NUMBERS = [
  { number: "191", tel: "tel:191" },
  { number: "1669", tel: "tel:1669" },
] as const;
