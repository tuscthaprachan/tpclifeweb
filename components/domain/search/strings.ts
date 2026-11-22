import { editableStrings } from "@/lib/i18n/editable";

export const SEARCH_TEXT = editableStrings(
  "domain-search",
  {
    typeTopic: { th: "หัวข้อ", en: "Topic" },
    typeShuttleRoute: { th: "รถรับส่ง", en: "Shuttle bus" },
    typePolicy: { th: "นโยบาย", en: "Policy" },
    typeOrganisation: { th: "หน่วยงาน", en: "Organisation" },
    typePlace: { th: "สถานที่", en: "Place" },
    typeCanteenDish: { th: "เมนูโรงอาหาร", en: "Canteen dish" },
    typeCanonicalDish: { th: "เมนูนี้คืออะไร", en: "What is this dish" },
    typeOpenDataDocument: { th: "เอกสารข้อมูลเปิด", en: "Open data document" },
    shortcutLabel: { th: "ทางลัดไปโรงอาหาร", en: "Canteen shortcut" },
    shortcutLink: { th: "ดูเมนูโรงอาหารราคาไม่เกิน {max} บาท{types}", en: "See canteen dishes under {max} baht{types}" },
    shortcutTypes: { th: " ({types})", en: " ({types})" },
    shortcutTypesJoin: { th: " และ ", en: " and " },
    shortcutNote: { th: "ราคามาจากการสำรวจ ทุกราคาบอกวันที่ตรวจไว้", en: "Prices come from our survey and show the day they were checked." },
  },
  { th: "ผลการค้นหา", en: "Search results" },
);
