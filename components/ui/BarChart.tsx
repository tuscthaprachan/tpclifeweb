import { useId } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { cx } from "./cx";
import { niceScale, px, scaleLength, wrapLabel } from "./chart-scale";

export interface BarChartDatum {
  label: string;
  value: number;
  /** The bar the title is about. Drawn in the accent colour; the others share one colour. */
  highlight?: boolean;
  /** The same measure for the earlier period, drawn as an outline bar beneath the value. */
  compare?: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  /** Short accessible name. A chart in a Figure repeats the Figure title here. */
  title: string;
  /** The alternative text, 100 to 200 characters, starting "A bar chart showing that". */
  description: string;
  locale: Locale;
  /** The unit, written once on the axis, such as "baht". */
  unit?: string;
  /** Legend names, used only when any datum has `compare`. */
  valueLabel?: string;
  compareLabel?: string;
  /** Defaults to `formatNumber`. */
  formatValue?: (value: number) => string;
  className?: string;
}

const WIDTH = 360;
const LEFT = 8;
const TOP = 6;
const BAR_HEIGHT = 18;
const BAR_GAP = 4;
const LINE_HEIGHT = 16;
const ROW_GAP = 14;
const CHAR_WIDTH = 7.4;
const LABEL_CHARS = 44;

function rowHeight(labelLines: number, bars: number): number {
  return labelLines * LINE_HEIGHT + 2 + bars * BAR_HEIGHT + (bars - 1) * BAR_GAP + ROW_GAP;
}

/**
 * Horizontal bars in the order given, from a zero baseline, with the value written at the end of
 * each bar. Server-rendered SVG: no script, no animation, theme colours from the tokens. The chart
 * is a single `role="img"`, so the same numbers must sit in a table beside it.
 */
export function BarChart({ data, title, description, locale, unit, valueLabel, compareLabel, formatValue, className }: BarChartProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const format = formatValue ?? ((value: number) => formatNumber(value, locale));
  const hasCompare = data.some((datum) => datum.compare !== undefined);

  const longest = data.reduce((max, datum) => Math.max(max, format(datum.value).length, datum.compare === undefined ? 0 : format(datum.compare).length), 0);
  const reserve = longest * CHAR_WIDTH + 8;
  const span = Math.max(120, WIDTH - LEFT - reserve);
  const scale = niceScale(Math.max(0, ...data.flatMap((datum) => [datum.value, datum.compare ?? 0])));

  const heights = data.map((datum) => {
    const lines = wrapLabel(datum.label, LABEL_CHARS);
    const bars = hasCompare && datum.compare !== undefined ? 2 : 1;
    return { datum, lines, bars };
  });
  const rows = heights.map((row, index) => {
    const labelY = TOP + heights.slice(0, index).reduce((sum, prior) => sum + rowHeight(prior.lines.length, prior.bars), 0);
    return { ...row, labelY, barY: labelY + row.lines.length * LINE_HEIGHT + 2 };
  });
  const plotBottom = TOP + heights.reduce((sum, row) => sum + rowHeight(row.lines.length, row.bars), 0) - ROW_GAP;
  const tickY = plotBottom + 16;
  const height = unit ? tickY + 16 : tickY + 4;

  return (
    <div className={className}>
      {hasCompare && valueLabel && compareLabel ? (
        <ul className="m-0 mb-[var(--space-2)] flex list-none flex-wrap gap-x-[var(--space-4)] gap-y-[var(--space-1)] p-0 text-sm text-ink-900">
          <li className="flex items-center gap-[var(--space-2)]">
            <svg aria-hidden="true" width="16" height="12" focusable="false">
              <rect width="16" height="12" className="fill-action" />
            </svg>
            {valueLabel}
          </li>
          <li className="flex items-center gap-[var(--space-2)]">
            <svg aria-hidden="true" width="16" height="12" focusable="false">
              <rect x="0.75" y="0.75" width="14.5" height="10.5" className="fill-none stroke-action" strokeWidth="1.5" />
            </svg>
            {compareLabel}
          </li>
        </ul>
      ) : null}
      <svg viewBox={`0 0 ${WIDTH} ${px(height)}`} role="img" aria-labelledby={`${titleId} ${descId}`} focusable="false" className="block h-auto w-full max-w-[560px] fill-ink-900">
        <title id={titleId}>{title}</title>
        <desc id={descId}>{description}</desc>

        {scale.ticks.map((tick, index) => {
          const x = px(LEFT + scaleLength(tick, scale.max, span));
          const text = format(tick);
          const anchor = index === 0 ? "start" : x + (text.length * 6.6) / 2 > WIDTH ? "end" : "middle";
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={TOP} y2={px(plotBottom)} className={index === 0 ? "stroke-line-strong" : "stroke-line"} strokeWidth={index === 0 ? 1.5 : 1} />
              <text x={x} y={px(tickY)} textAnchor={anchor} fontSize="12" className="fill-ink-600">
                {text}
              </text>
            </g>
          );
        })}
        {unit ? (
          <text x={LEFT} y={px(tickY + 14)} fontSize="12" className="fill-ink-600">
            {unit}
          </text>
        ) : null}

        {rows.map(({ datum, lines, labelY, barY }, index) => {
          const current = scaleLength(datum.value, scale.max, span);
          const previous = datum.compare === undefined ? null : scaleLength(datum.compare, scale.max, span);
          return (
            <g key={`${index}-${datum.label}`}>
              {lines.map((line, lineIndex) => (
                <text key={lineIndex} x={LEFT} y={px(labelY + 12 + lineIndex * LINE_HEIGHT)} fontSize="13">
                  {line}
                </text>
              ))}
              <rect x={LEFT} y={px(barY)} width={px(current)} height={BAR_HEIGHT} className={datum.highlight ? "fill-accent" : "fill-action"} />
              <text x={px(LEFT + current + 6)} y={px(barY + 13)} fontSize="13" fontWeight="600" className="tabular-nums">
                {format(datum.value)}
              </text>
              {previous !== null && datum.compare !== undefined ? (
                <>
                  <rect
                    x={LEFT + 0.75}
                    y={px(barY + BAR_HEIGHT + BAR_GAP + 0.75)}
                    width={px(Math.max(0, previous - 1.5))}
                    height={BAR_HEIGHT - 1.5}
                    className={cx("fill-none", datum.highlight ? "stroke-accent" : "stroke-action")}
                    strokeWidth="1.5"
                  />
                  <text x={px(LEFT + previous + 6)} y={px(barY + BAR_HEIGHT + BAR_GAP + 13)} fontSize="13" className="fill-ink-600 tabular-nums">
                    {format(datum.compare)}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
