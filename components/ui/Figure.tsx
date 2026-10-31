import type { ReactNode } from "react";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { cx } from "./cx";
import { Details } from "./Details";
import { DownloadList, type DownloadItem } from "./DownloadList";
import { Heading } from "./Heading";

interface FigureProps {
  id: string;
  locale: Locale;
  number: number;
  /** "figure" (default) for a chart or image, "table" when the content is a table. */
  kind?: "figure" | "table";
  /** The finding, in 15 words or fewer. */
  title: string;
  /** Measure, body and period, comma separated. */
  subtitle?: string;
  headingLevel: HeadingLevel;
  children: ReactNode;
  /** The source line, such as a linked document name and the body that published it. */
  source?: ReactNode;
  footnotes?: ReactNode[];
  downloads?: DownloadItem[];
  className?: string;
}

/**
 * The ONS figure wrapper: number, finding as title, subtitle, content, source, then notes and
 * downloads in native disclosures. Used for charts, tables and images alike so numbering is
 * consistent. The subtitle is a paragraph, not a heading, so the outline gains one entry only.
 */
export function Figure({ id, locale, number, kind = "figure", title, subtitle, headingLevel, children, source, footnotes, downloads, className }: FigureProps) {
  const word = kind === "table" ? UI.odTable[locale] : UI.odFigure[locale];
  const numberLabel = `${word} ${formatNumber(number, locale)}`;
  const titleId = `${id}-title`;
  const hasNotes = footnotes && footnotes.length > 0;
  const hasDownloads = downloads && downloads.length > 0;

  return (
    <div className={cx("flex flex-col gap-[var(--space-3)]", className)}>
      <figure id={id} aria-labelledby={titleId} className="m-0 flex flex-col gap-[var(--space-2)]">
        <div>
          <span className="block text-sm font-semibold text-ink-600">{numberLabel}</span>
          <Heading level={headingLevel} id={titleId} className="m-0">
            {title}
          </Heading>
          {subtitle ? <p className="m-0 mt-[var(--space-1)] text-ink-600">{subtitle}</p> : null}
        </div>
        {children}
        {source ? (
          <figcaption className="text-sm text-ink-600">
            {UI.odSource[locale]}: {source}
          </figcaption>
        ) : null}
      </figure>

      {hasNotes ? (
        <Details summary={UI.odNotes[locale]}>
          <ol className="m-0 flex flex-col gap-[var(--space-1)] pl-[var(--space-5)]">
            {footnotes.map((note, index) => (
              <li key={index} id={`${id}-note-${index + 1}`}>
                {note}
              </li>
            ))}
          </ol>
        </Details>
      ) : null}

      {hasDownloads ? (
        <Details summary={UI.odDownloadData[locale].replace("{label}", numberLabel)}>
          <DownloadList items={downloads} />
        </Details>
      ) : null}
    </div>
  );
}
