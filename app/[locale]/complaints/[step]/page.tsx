import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { stepTitle } from "../_journey/copy";
import { JourneyStep } from "../_journey/JourneyStep";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { isStep } from "@/lib/complaints/public/steps";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; step: string }> }): Promise<Metadata> {
  const { locale: rawLocale, step } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  if (!isStep(step)) return {};
  return {
    alternates: alternatesFor(locale, `/complaints/${step}`),
    title: stepTitle(step, locale),
    // Question pages hold a person's draft; they are never for a search engine, and links off them carry no referrer. Not no-referrer: a form posted from such a page would send `Origin: null`, which Server Actions reject.
    robots: { index: false, follow: false },
    referrer: "same-origin",
  };
}

export default async function ComplaintStepPage({ params, searchParams }: { params: Promise<{ locale: string; step: string }>; searchParams: Promise<SearchParams> }) {
  const { locale, step } = await params;
  if (!isStep(step)) notFound();
  const query = await searchParams;
  return <JourneyStep locale={locale} step={step} from={first(query.from)} email={first(query.email)} />;
}
