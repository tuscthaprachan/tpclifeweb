/**
 * Group heading / tag text for each `SearchableType`, shown on the search
 * results page and on each `SearchResultItem`.
 *
 * Six of these reuse an existing string from `lib/i18n/strings.ts` because
 * they name exactly the same thing the primary/footer navigation already
 * calls it (CONTRIBUTING: "Reuse a string... rather than inventing a
 * synonym"). Four types have no existing match: `shuttleRoute` is a single
 * route, not the "Getting around" section; `policy` here labels one item,
 * not the whole "Policy progress" dashboard (UI.policyTracker); and
 * `organisation` / `place` are the two halves of "Directory" (UI.directory)
 * with no distinct label of their own. Those four are hardcoded here.
 *
 * TODO: add to UI strings: searchTypeShuttleRoute, searchTypePolicy,
 * searchTypeOrganisation, searchTypePlace.
 */

import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { SearchableType } from "@/lib/content/types";

export const SEARCH_TYPE_LABEL: Record<SearchableType, LocaleString> = {
  form: UI.forms,
  welfarePage: UI.welfare,
  guidePage: UI.guide,
  faq: UI.faq,
  event: UI.events,
  newsPost: UI.news,
  // TODO: add to UI strings
  shuttleRoute: { th: "รถรับส่ง", en: "Shuttle bus" },
  // TODO: add to UI strings
  policy: { th: "นโยบาย", en: "Policy" },
  // TODO: add to UI strings
  organisation: { th: "หน่วยงาน", en: "Organisation" },
  // TODO: add to UI strings
  place: { th: "สถานที่", en: "Place" },
  lostFoundItem: UI.lostAndFound,
  canteenDish: { th: "เมนูโรงอาหาร", en: "Canteen dish" },
  canonicalDish: { th: "เมนูนี้คืออะไร", en: "What is this dish" },
  openDataPage: UI.odOpenData,
  openDataDocument: { th: "เอกสารข้อมูลเปิด", en: "Open data document" },
};
