import { useId } from "react";

import { DataTable, Details, Heading, Timestamp, type DataTableColumn } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

import { EXTRAS, extras } from "./strings";
import type { ChartPoint } from "./priceHistory";

/** The chart plots at most this many points; the table always has every one. */
export const MAX_PLOTTED = 8;

interface PriceHistoryChartProps {
  /** Oldest first. Surveyed figures only: the chart never adds a point that was not surveyed. */
  points: readonly ChartPoint[];
  locale: Locale;
  /** Names the chart and its table. */
  title: string;
  headingLevel?: HeadingLevel;
  /** Column header for the value in the table, for example "Median (baht)". */
  valueHeader: string;
  /** Header and content of an optional extra table column, for example the plate count. */
  noteHeader?: string;
  /** Header of the first table column. When unset the column is left out. */
  whenHeader?: string;
  className?: string;
}

const WIDTH = 320;
const HEIGHT = 190;
const LEFT = 34;
const RIGHT = 30;
const TOP = 26;

/** Rounds a maximum up to a tidy top of the axis: 45 gives 50, 120 gives 150. */
function niceMax(value: number): number {
  if (value <= 0) return 10;
  const step = value <= 50 ? 10 : value <= 100 ? 20 : 50;
  return Math.ceil(value / step) * step;
}

/**
 * A small line chart of surveyed prices, with the values written on the
 * points (so nothing depends on colour or on reading the axis) and the same
 * numbers in a table behind "Show as a table". The vertical axis starts at
 * zero so a rise of 5 baht looks like 5 baht. Points are evenly spaced, one
 * per survey, and are joined by a line only to show the order; the line is
 * not a claim about prices between surveys.
 *
 * Colours are tokens, so it follows the light and dark themes.
 */
export function PriceHistoryChart({
  points,
  locale,
  title,
  headingLevel = 3,
  valueHeader,
  noteHeader,
  whenHeader,
  className,
}: PriceHistoryChartProps) {
  const id = useId();
  if (points.length === 0) return null;

  const plotted = points.slice(-MAX_PLOTTED);
  const top = niceMax(Math.max(...plotted.map((point) => point.value)));
  const longest = Math.max(...plotted.map((point) => point.label.length));
  const plotWidth = WIDTH - LEFT - RIGHT;
  const step = plotted.length > 1 ? plotWidth / (plotted.length - 1) : plotWidth;
  const rotate = plotted.length > 1 && step < longest * 7 + 6;
  const bottom = rotate ? 54 : 30;
  const plotHeight = HEIGHT - TOP - bottom;
  const x = (index: number) => (plotted.length === 1 ? LEFT + plotWidth / 2 : LEFT + index * step);
  const y = (value: number) => TOP + plotHeight - (value / top) * plotHeight;
  const baseline = y(0);

  const summary = extras.chartSummary(
    locale,
    title,
    plotted.map((point) => `${extras.baht(locale, point.value)} (${point.label})`),
  );

  const columns: DataTableColumn<ChartPoint>[] = [
    ...(whenHeader ? [{ id: "when", header: whenHeader, cell: (point: ChartPoint) => point.label }] : []),
    {
      id: "date",
      header: locale === "th" ? EXTRAS.colDate.th : EXTRAS.colDate.en,
      cell: (point) => <Timestamp value={point.checkedOn} locale={locale} />,
    },
    { id: "value", header: valueHeader, align: "end", cell: (point) => formatNumber(point.value, locale) },
    ...(noteHeader ? [{ id: "note", header: noteHeader, align: "end" as const, cell: (point: ChartPoint) => point.note ?? "" }] : []),
  ];

  return (
    <figure className={cx("m-0 flex flex-col gap-[var(--space-3)]", className)}>
      <figcaption>
        <Heading level={headingLevel} visualLevel={5} className="m-0">
          {title}
        </Heading>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${id}-title`}
        className="h-auto w-full max-w-[28rem]"
        style={{ overflow: "visible" }}
      >
        <title id={`${id}-title`}>{summary}</title>

        {/* Axis: zero line, and the top of the scale as a faint rule with its number. */}
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={baseline} y2={baseline} style={{ stroke: "var(--line-strong)" }} strokeWidth={1} />
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(top)} y2={y(top)} style={{ stroke: "var(--line)" }} strokeWidth={1} strokeDasharray="3 3" />
        <text x={LEFT - 6} y={baseline + 4} textAnchor="end" fontSize={12} style={{ fill: "var(--ink-600)" }}>
          0
        </text>
        <text x={LEFT - 6} y={y(top) + 4} textAnchor="end" fontSize={12} style={{ fill: "var(--ink-600)" }}>
          {formatNumber(top, locale)}
        </text>

        {plotted.length > 1 ? (
          <polyline
            points={plotted.map((point, index) => `${x(index)},${y(point.value)}`).join(" ")}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ stroke: "var(--colour-action)" }}
          />
        ) : null}

        {plotted.map((point, index) => (
          <g key={`${point.checkedOn}-${index}`}>
            <circle cx={x(index)} cy={y(point.value)} r={5} strokeWidth={2} style={{ fill: "var(--colour-action)", stroke: "var(--surface)" }} />
            <text
              x={x(index)}
              y={y(point.value) - 11}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              paintOrder="stroke"
              strokeWidth={3}
              style={{ fill: "var(--ink-900)", stroke: "var(--surface)" }}
            >
              {formatNumber(point.value, locale)}
            </text>
            <text
              x={x(index)}
              y={baseline + 16}
              textAnchor={rotate ? "end" : "middle"}
              fontSize={12}
              transform={rotate ? `rotate(-40 ${x(index)} ${baseline + 16})` : undefined}
              style={{ fill: "var(--ink-600)" }}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>

      {points.length > plotted.length ? (
        <p className="m-0 text-sm text-ink-600">{extras.plottedLatest(locale, plotted.length, points.length)}</p>
      ) : null}

      <Details summary={EXTRAS.showAsTable[locale]}>
        <DataTable
          caption={title}
          columns={columns}
          rows={[...points]}
          getRowKey={(point) => `${point.checkedOn}-${point.label}`}
        />
      </Details>
    </figure>
  );
}
