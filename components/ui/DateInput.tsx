import type { ReactNode } from "react";
import { Fieldset } from "./Fieldset";
import { cx } from "./cx";

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

interface DateInputProps {
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Field labels ("Day" / "วัน" etc). Supplied by the caller: there is no generic day/month/year entry in lib/i18n/strings.ts. */
  dayLabel: string;
  monthLabel: string;
  yearLabel: string;
  value?: DateParts;
  defaultValue?: Partial<DateParts>;
  onValueChange?: (value: DateParts) => void;
  className?: string;
}

const FIELD_WIDTH: Record<keyof DateParts, string> = {
  day: "4rem",
  month: "4rem",
  year: "5.5rem",
};

const MAX_LENGTH: Record<keyof DateParts, number> = { day: 2, month: 2, year: 4 };

/**
 * Three separate fields, the GOV.UK pattern, not a native date picker: a
 * native `<input type="date">` renders a different control per browser and
 * per OS locale, which is exactly the inconsistency this pattern avoids, and
 * it cannot show the Buddhist year Thai readers expect (lib/i18n/format.ts).
 */
export function DateInput({ id, legend, hint, error, dayLabel, monthLabel, yearLabel, value, defaultValue, onValueChange, className }: DateInputProps) {
  const parts: Array<{ key: keyof DateParts; label: string; autoComplete: string }> = [
    { key: "day", label: dayLabel, autoComplete: "bday-day" },
    { key: "month", label: monthLabel, autoComplete: "bday-month" },
    { key: "year", label: yearLabel, autoComplete: "bday-year" },
  ];

  function update(part: keyof DateParts, next: string) {
    if (!onValueChange) return;
    const base: DateParts = value ?? { day: defaultValue?.day ?? "", month: defaultValue?.month ?? "", year: defaultValue?.year ?? "" };
    onValueChange({ ...base, [part]: next });
  }

  return (
    <Fieldset legend={legend} hint={hint} error={error} id={id} className={className}>
      <div className="flex gap-[var(--space-4)]">
        {parts.map(({ key, label, autoComplete }) => (
          <div key={key} className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor={`${id}-${key}`} className="text-sm font-medium text-ink-900">
              {label}
            </label>
            <input
              id={`${id}-${key}`}
              name={`${id}-${key}`}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={autoComplete}
              maxLength={MAX_LENGTH[key]}
              style={{ width: FIELD_WIDTH[key] }}
              className={cx(
                "min-h-[var(--target-min)] rounded-control bg-surface px-[var(--space-2)] py-[var(--space-2)] text-base text-ink-900",
                error ? "border-[var(--border-width-thick)] border-error" : "border border-line-strong",
              )}
              value={value?.[key]}
              defaultValue={value === undefined ? defaultValue?.[key] : undefined}
              onChange={onValueChange ? (event) => update(key, event.target.value) : undefined}
            />
          </div>
        ))}
      </div>
    </Fieldset>
  );
}
