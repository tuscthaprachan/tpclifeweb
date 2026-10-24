import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { stepTitle } from "../../../_journey/copy";
import { JourneyStep } from "../../../_journey/JourneyStep";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { isStep } from "@/lib/lost-found/public/steps";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string; step: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug, step } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  if (!isStep("claim", step)) return {};
  return {
    alternates: alternatesFor(locale, `/lost-and-found/${slug}/claim/${step}`),
    title: stepTitle("claim", step, locale),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function ClaimStepPage({ params, searchParams }: { params: Promise<{ locale: string; slug: string; step: string }>; searchParams: Promise<SearchParams> }) {
  const { locale, slug, step } = await params;
  if (!isStep("claim", step)) notFound();
  const query = await searchParams;
  return <JourneyStep kind="claim" locale={locale} step={step} slug={slug} from={first(query.from)} email={first(query.email)} />;
}
