/** Pure geometry for BarChart and ColumnChart, kept apart from the markup so it can be tested. */

export interface NiceScale {
  max: number;
  step: number;
  ticks: number[];
}

const STEP_MULTIPLES = [1, 2, 2.5, 5, 10];

/**
 * A zero-based scale: ticks at round steps from 0 up to the first step at or above `maxValue`.
 * The axis always starts at zero, so bar length is proportional to the value.
 */
export function niceScale(maxValue: number, targetTicks = 4): NiceScale {
  const top = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const rough = top / Math.max(1, targetTicks);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = (STEP_MULTIPLES.find((multiple) => multiple * magnitude >= rough) ?? 10) * magnitude;
  const count = Math.ceil(top / step - 1e-9);
  const ticks: number[] = [];
  for (let index = 0; index <= count; index += 1) ticks.push(Number((index * step).toPrecision(12)));
  return { max: ticks[ticks.length - 1] ?? step, step, ticks };
}

/** Length of a bar for `value` on a zero-based axis of `domainMax` across `span` units. Negative and non-finite values draw nothing. */
export function scaleLength(value: number, domainMax: number, span: number): number {
  if (!Number.isFinite(value) || value <= 0 || domainMax <= 0) return 0;
  return Math.min(span, (value / domainMax) * span);
}

/** Breaks a label into lines of at most `maxChars`, on spaces, so long Thai or English names stay inside the chart. */
export function wrapLabel(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/** Rounds to one decimal place for SVG attributes. */
export function px(value: number): number {
  return Math.round(value * 10) / 10;
}
