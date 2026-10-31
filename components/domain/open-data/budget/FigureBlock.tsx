import type { ReactNode } from "react";
import { Details } from "@/components/ui/Details";
import { DownloadList, type DownloadItem } from "@/components/ui/DownloadList";
import { Figure } from "@/components/ui/Figure";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";

interface FigureBlockProps {
  id: string;
  locale: Locale;
  number: number;
  headingLevel: HeadingLevel;
  title: string;
  subtitle: string;
  source: ReactNode;
  footnotes: ReactNode[];
  chart: ReactNode;
  /** The table that holds the chart's numbers, shown straight after the chart's source and notes. */
  table: ReactNode;
  download: DownloadItem;
}

/** A figure, then the table of the same numbers, then the CSV download: the order the ONS pattern asks for. */
export function FigureBlock({ id, locale, number, headingLevel, title, subtitle, source, footnotes, chart, table, download }: FigureBlockProps) {
  const label = `${UI.odFigure[locale]} ${formatNumber(number, locale)}`;
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <Figure id={id} locale={locale} number={number} headingLevel={headingLevel} title={title} subtitle={subtitle} source={source} footnotes={footnotes}>
        {chart}
      </Figure>
      {table}
      <Details summary={UI.odDownloadData[locale].replace("{label}", label)}>
        <DownloadList items={[download]} />
      </Details>
    </div>
  );
}
