import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { stepTitle } from "../../_journey/copy";
import { JourneyStep } from "../../_journey/JourneyStep";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { isStep } from "@/lib/lost-found/public/steps";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; step: string }> }): Promise<Metadata> {
  const { locale: rawLocale, step } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  if (!isStep("found", step)) return {};
  return {
    alternates: alternatesFor(locale, `/lost-and-found/found/${step}`),
    title: stepTitle("found", step, locale),
    // Question pages hold a person's draft; they are never for a search engine, and links off them carry no referrer.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function JourneyStepPage({ params, searchParams }: { params: Promise<{ locale: string; step: string }>; searchParams: Promise<SearchParams> }) {
  const { locale, step } = await params;
  if (!isStep("found", step)) notFound();
  const query = await searchParams;
  return <JourneyStep kind="found" locale={locale} step={step} from={first(query.from)} email={first(query.email)} />;
}
