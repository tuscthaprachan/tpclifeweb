import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LostFoundCategory } from "@/lib/sanity/types";

/** Localised label for the `LostFoundCategory` union. */
export function categoryLabel(category: LostFoundCategory, locale: Locale): string {
  switch (category) {
    case "idCard":
      return UI.lostFoundCategoryIdCard[locale];
    case "bankCard":
      return UI.lostFoundCategoryBankCard[locale];
    case "keys":
      return UI.lostFoundCategoryKeys[locale];
    case "wallet":
      return UI.lostFoundCategoryWallet[locale];
    case "phone":
      return UI.lostFoundCategoryPhone[locale];
    case "laptop":
      return UI.lostFoundCategoryLaptop[locale];
    case "bag":
      return UI.lostFoundCategoryBag[locale];
    case "clothing":
      return UI.lostFoundCategoryClothing[locale];
    case "book":
      return UI.lostFoundCategoryBook[locale];
    case "stationery":
      return UI.lostFoundCategoryStationery[locale];
    case "jewellery":
      return UI.lostFoundCategoryJewellery[locale];
    case "eyewear":
      return UI.lostFoundCategoryEyewear[locale];
    case "umbrella":
      return UI.lostFoundCategoryUmbrella[locale];
    case "waterBottle":
      return UI.lostFoundCategoryWaterBottle[locale];
    case "other":
      return UI.lostFoundCategoryOther[locale];
  }
}

/** Every `LostFoundCategory` value, in the order they should list in a filter or select. */
export const LOST_FOUND_CATEGORIES: readonly LostFoundCategory[] = [
  "idCard",
  "bankCard",
  "keys",
  "wallet",
  "phone",
  "laptop",
  "bag",
  "clothing",
  "book",
  "stationery",
  "jewellery",
  "eyewear",
  "umbrella",
  "waterBottle",
  "other",
];
