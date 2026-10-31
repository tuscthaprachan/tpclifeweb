const BASE = "/admin/content/open-data";

/** Where each open data editor lives. */
export const OPEN_DATA_PATHS = {
  documents: BASE,
  meetings: `${BASE}/meetings`,
  budget: `${BASE}/budget`,
  funds: `${BASE}/budget/funds`,
  import: `${BASE}/budget/import`,
} as const;
