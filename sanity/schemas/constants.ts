/**
 * Option lists shared across several schemas, kept in one place so a label
 * or value never drifts between, say, the `form` and `newsPost` category
 * pickers.
 */

/** Matches the `Category` union in `lib/sanity/types.ts`. Maps one to one onto the `--fill-*` tokens. */
export const CATEGORY_OPTIONS = [
  { title: "Transport (shuttle, buses, anything time sensitive)", value: "transport" },
  { title: "Welfare (health, wellbeing)", value: "welfare" },
  { title: "Activity (clubs, events)", value: "activity" },
  { title: "Governance (TUSU, TUSC, policy)", value: "governance" },
];

/** Matches the `Owner` union in `lib/sanity/types.ts`. Every governance item must be attributed. */
export const OWNER_OPTIONS = [
  { title: "TUSU (the student union)", value: "tusu" },
  { title: "TUSC (the student council)", value: "tusc" },
  { title: "University", value: "university" },
  { title: "Joint", value: "joint" },
];

/** 0 = Sunday through 6 = Saturday, matching `Date#getDay`. */
export const WEEKDAY_OPTIONS = [
  { title: "Sunday", value: 0 },
  { title: "Monday", value: 1 },
  { title: "Tuesday", value: 2 },
  { title: "Wednesday", value: 3 },
  { title: "Thursday", value: 4 },
  { title: "Friday", value: 5 },
  { title: "Saturday", value: 6 },
];
