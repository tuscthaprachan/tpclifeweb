import { editableStrings } from "@/lib/i18n/editable";

/** The line under a canteen dish in the search results. */
export const SEARCH_RESULT_TEXT = editableStrings(
  "lib-search",
  {
    dishStall: { th: "ร้าน {number} ", en: "Stall {number}, " },
    dishSummary: { th: "{stall}{price} บาท ตรวจเมื่อ {date}", en: "{stall}{price} baht, checked {date}" },
  },
  { th: "ผลการค้นหา: เมนูโรงอาหาร", en: "Search results: canteen dishes" },
);
