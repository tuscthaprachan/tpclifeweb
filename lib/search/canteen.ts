/**
 * Canteen dishes and canonical dishes as search records.
 *
 * Built in code from the one cached canteen dataset rather than by another
 * GROQ projection, so the haystack logic (aliases folded in, both languages,
 * stall and type words) is unit tested and the same dataset feeds search and
 * the /eat pages.
 *
 * ALIASES. A canonical dish's `aliases` ("krapow", "kaprao", "กะเพา") go into
 * its own haystack AND into the haystack of every dish mapped to it, so any
 * spelling finds the explainer and every stall's version of the dish.
 *
 * HONESTY. A dish's summary shows its price with the day it was checked.
 */

import { TYPE_LABEL } from "@/components/domain/canteen/labels";
import { excerpt } from "@/components/domain/canteen/extras/text";
import { indexCanteen, stallOf } from "@/lib/canteen/derive";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import type { LocaleString } from "@/lib/i18n/config";
import type { CanteenData, SearchRecord } from "@/lib/sanity/types";

/** Dishes rank below forms and the canonical explainers, above news. */
const DISH_WEIGHT = 35;
const CANONICAL_WEIGHT = 45;

const join = (...parts: Array<string | undefined | null>): string => parts.filter(Boolean).join(" ");

/** Every dish and canonical dish in the dataset as a `SearchRecord`. */
export function canteenSearchRecords(data: CanteenData): SearchRecord[] {
  const index = indexCanteen(data);
  const records: SearchRecord[] = [];

  for (const canonical of data.canonicals) {
    const phrases = (canonical.howToOrder ?? []).map((phrase) => join(phrase.th, phrase.romanised, phrase.en));
    const explainer: LocaleString = {
      th: excerpt(canonical.explainer?.th, 160),
      en: excerpt(canonical.explainer?.en, 160),
    };
    records.push({
      id: canonical._id,
      type: "canonicalDish",
      path: {
        th: `/th/eat/what-is/${canonical.slug.current}`,
        en: `/en/eat/what-is/${canonical.slug.current}`,
      },
      title: canonical.name,
      summary: explainer,
      haystack: join(
        canonical.name?.th,
        canonical.name?.en,
        (canonical.aliases ?? []).join(" "),
        canonical.explainer?.th,
        canonical.explainer?.en,
        phrases.join(" "),
      ),
      weight: CANONICAL_WEIGHT,
    });
  }

  for (const dish of data.dishes) {
    const stall = stallOf(data, dish);
    const canonical = dish.canonical ? index.canonicalById.get(dish.canonical._ref) : undefined;
    const price = (locale: "th" | "en") =>
      locale === "th"
        ? `${stall ? `ร้าน ${formatNumber(stall.number, "th")} ` : ""}${formatNumber(dish.price, "th")} บาท ตรวจเมื่อ ${formatDate(dish.checkedOn, "th")}`
        : `${stall ? `Stall ${stall.number}, ` : ""}${formatNumber(dish.price, "en")} baht, checked ${formatDate(dish.checkedOn, "en")}`;
    records.push({
      id: dish._id,
      type: "canteenDish",
      path: { th: `/th/eat/dishes/${dish.slug.current}`, en: `/en/eat/dishes/${dish.slug.current}` },
      title: dish.name,
      summary: { th: price("th"), en: price("en") },
      haystack: join(
        dish.name?.th,
        dish.name?.en,
        stall?.name?.th,
        stall?.name?.en,
        canonical?.name?.th,
        canonical?.name?.en,
        (canonical?.aliases ?? []).join(" "),
        TYPE_LABEL[dish.type]?.th,
        TYPE_LABEL[dish.type]?.en,
      ),
      weight: DISH_WEIGHT,
    });
  }

  return records;
}
