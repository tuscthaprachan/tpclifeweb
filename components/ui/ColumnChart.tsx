import { useId } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { niceScale, px, scaleLength, wrapLabel } from "./chart-scale";

export interface ColumnChartDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

interface ColumnChartProps {
  data: ColumnChartDatum[];
  title: string;
  /** The alternative text, 100 to 200 characters, starting "A column chart showing that". */
  description: string;
  locale: Locale;
  unit?: string;
  /** A dashed horizontal line to read the columns against, such as the number of seats. */
  referenceLine?: { value: number; label: string };
  formatValue?: (value: number) => string;
  className?: string;
}

const WIDTH = 360;
const TOP = 22;
const PLOT_HEIGHT = 190;
const RIGHT = 8;
const CHAR_WIDTH = 6.6;

/**
 * Vertical columns from a zero baseline, for a short series in time order. Each column carries its
 * value; an optional dashed reference line is labelled on the chart. Server-rendered SVG, no script.
 */
export function ColumnChart({ data, title, description, locale, unit, referenceLine, formatValue, className }: ColumnChartProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const format = formatValue ?? ((value: number) => formatNumber(value, locale));

  const scale = niceScale(Math.max(0, referenceLine?.value ?? 0, ...data.map((datum) => datum.value)));
  const tickChars = scale.ticks.reduce((max, tick) => Math.max(max, format(tick).length), 1);
  const left = tickChars * CHAR_WIDTH + 12;
  const slot = (WIDTH - left - RIGHT) / Math.max(1, data.length);
  const columnWidth = Math.min(40, slot * 0.6);
  const labelLines = data.map((datum) => wrapLabel(datum.label, Math.max(4, Math.floor(slot / 6.2))));
  const labelRows = Math.max(1, ...labelLines.map((lines) => lines.length));
  const baseline = TOP + PLOT_HEIGHT;
  const height = baseline + 8 + labelRows * 15 + 4;
  const yOf = (value: number) => baseline - scaleLength(value, scale.max, PLOT_HEIGHT);

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${WIDTH} ${px(height)}`} role="img" aria-labelledby={`${titleId} ${descId}`} focusable="false" className="block h-auto w-full max-w-[560px] fill-ink-900">
        <title id={titleId}>{title}</title>
        <desc id={descId}>{description}</desc>

        {unit ? (
          <text x={0} y={10} fontSize="12" className="fill-ink-600">
            {unit}
          </text>
        ) : null}

        {scale.ticks.map((tick, index) => (
          <g key={tick}>
            <line x1={px(left)} x2={WIDTH - RIGHT} y1={px(yOf(tick))} y2={px(yOf(tick))} className={index === 0 ? "stroke-line-strong" : "stroke-line"} strokeWidth={index === 0 ? 1.5 : 1} />
            <text x={px(left - 6)} y={px(yOf(tick) + 4)} textAnchor="end" fontSize="12" className="fill-ink-600 tabular-nums">
              {format(tick)}
            </text>
          </g>
        ))}

        {data.map((datum, index) => {
          const centre = left + slot * index + slot / 2;
          const top = yOf(datum.value);
          return (
            <g key={`${index}-${datum.label}`}>
              <rect x={px(centre - columnWidth / 2)} y={px(top)} width={px(columnWidth)} height={px(baseline - top)} className={datum.highlight ? "fill-accent" : "fill-action"} />
              <text x={px(centre)} y={px(top - 5)} textAnchor="middle" fontSize="13" fontWeight="600" className="tabular-nums">
                {format(datum.value)}
              </text>
              {(labelLines[index] ?? []).map((line, lineIndex) => (
                <text key={lineIndex} x={px(centre)} y={px(baseline + 18 + lineIndex * 15)} textAnchor="middle" fontSize="12">
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {referenceLine ? (
          <g>
            <line x1={px(left)} x2={WIDTH - RIGHT} y1={px(yOf(referenceLine.value))} y2={px(yOf(referenceLine.value))} className="stroke-ink-900" strokeWidth="1.5" strokeDasharray="6 4" />
            <text x={WIDTH - RIGHT} y={px(yOf(referenceLine.value) - 5)} textAnchor="end" fontSize="12" fontWeight="600">
              {referenceLine.label}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
