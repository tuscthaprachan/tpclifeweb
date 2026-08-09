import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatDateTime, formatRelative, isoDateTime } from "@/lib/i18n/format";

interface TimestampProps {
  value: string | Date;
  locale: Locale;
  className?: string;
  /** "date" (default) for a plain published/reviewed date, "datetime" to also show the time, "relative" for the coarse "3 months ago" phrasing used on the policy dashboard. */
  format?: "date" | "datetime" | "relative";
  now?: Date;
}

/** Visible localised text plus a machine-readable `<time datetime>`, always both. */
export function Timestamp({ value, locale, className, format = "date", now }: TimestampProps) {
  const text =
    format === "datetime"
      ? formatDateTime(value, locale)
      : format === "relative"
        ? formatRelative(value, locale, now)
        : formatDate(value, locale);

  return (
    <time dateTime={isoDateTime(value)} className={className}>
      {text}
    </time>
  );
}
