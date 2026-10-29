/**
 * Decide for me. A seeded random pick: the same URL always gives the same
 * result, so every result is shareable and reproducible. With no `seed` in the
 * URL the address is replaced by the same URL with a fresh one.
 *
 * Parameters: every filter (read with `readFilters`) plus
 *   seed  short random string
 *   mode  dish (default) | meal | stall
 *   meal  budget for the whole meal in baht, meal mode only (`max` is the per-dish filter)
 *   bias  fair (default) | new | cheap | usual
 *   lock  stall, type, canonical (kept from the dish named by `of`)
 *   of    slug of the previous dish the lock is relative to
 *   not   dish slugs passed over with "Not feeling it"
 *
 * Prerendered: it does not read the query, so it is only the controls and a way to start. The pick is worked out
 * by components/domain/canteen/pages/Pick.tsx from the address, in the browser. A full page load of a URL with a
 * query is answered by the copy under `filtered/` instead, which redirects to a seeded URL. Without JavaScript the
 * plain /eat/pick sends the reader to `?seed=` (a `<meta http-equiv="refresh">` inside `<noscript>`), and that
 * request gets a seed from the filtered copy.
 *
 * The server cannot see the device (history, favourites and dislikes are in
 * localStorage), so a full page load uses bias fair or cheap and no history; `new`
 * and `usual` fall back to fair there. With JavaScript the `Randomiser` island
 * re-runs the pick with the device data and replaces the result. See that file.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PICK, PICK_ROUTE } from "@/components/domain/canteen/pick";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { EatPick } from "./EatPick";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, PICK_ROUTE),
    title: PICK.title[locale],
    description: PICK.intro[locale],
    // A seeded result is one of endlessly many URLs. The page itself is the thing to index.
    robots: { index: false, follow: true },
  };
}

export default async function EatPickPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EatPick locale={locale} filtered={false} />;
}
