import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TUSC_PATH, TuscShell, fillText, fiscalYearLabel } from "@/components/domain/open-data";
import { Bulletin, RELEASE_DATE } from "@/components/domain/open-data/budget/Bulletin";
import { getBudgetBulletinYears, getBudgetFiles } from "@/components/domain/open-data/budget/data";
import { PRINTED_TOTAL } from "@/components/domain/open-data/budget/printed";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/i18n/config";
import { formatMoneyAmount } from "@/components/domain/open-data/money";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataBudgetLines, getOpenDataDocuments, getOpenDataMeetings } from "@/lib/open-data/read";

const PLACEHOLDER_YEAR = "_";

export async function generateStaticParams() {
  const years = (await getBudgetBulletinYears()).map(String);
  return LOCALES.flatMap((locale) => (years.length > 0 ? years : [PLACEHOLDER_YEAR]).map((fiscalYear) => ({ locale, fiscalYear })));
}

function parseYear(raw: string): number | null {
  return /^\d{4}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; fiscalYear: string }> }): Promise<Metadata> {
  const { locale: rawLocale, fiscalYear } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const year = parseYear(fiscalYear);
  if (year === null) return {};
  const total = PRINTED_TOTAL[year]?.amount;
  return {
    alternates: alternatesFor(locale, `${TUSC_PATH}/budget/${year}`),
    title: `${fillText(UI.odBudBulletinTitle[locale], { year, ce: year - 543 })} | ${UI.odTuscShort[locale]}`,
    description: total
      ? fillText(UI.odBudSummary[locale], { fy: fiscalYearLabel(year, locale), total: formatMoneyAmount(total, locale), share: "58.9" })
      : UI.odBudIndexSummary[locale],
  };
}

export default async function TuscBudgetYearPage({ params }: { params: Promise<{ locale: string; fiscalYear: string }> }) {
  const { locale: rawLocale, fiscalYear } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const year = parseYear(fiscalYear);
  if (year === null) notFound();

  const [lines, documents, meetings, files] = await Promise.all([
    getOpenDataBudgetLines(),
    getOpenDataDocuments(),
    getOpenDataMeetings(),
    getBudgetFiles(year),
  ]);
  if (!lines.some((l) => l.fiscalYear === year && l.view === "project")) notFound();

  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const meeting = meetings.find((m) => m.meetingDate === RELEASE_DATE);
  const budgetTitle = fillText(UI.odBudBulletinTitle[locale], { year, ce: year - 543 });

  return (
    <TuscShell locale={locale} current="budget" trail={[{ label: budgetTitle }]}>
      <Bulletin
        locale={locale}
        year={year}
        lines={lines}
        documents={documents}
        meetingSlug={meeting?.slug ?? null}
        files={files}
        updated={updated}
        datasetRows={lines.length}
      />
    </TuscShell>
  );
}
