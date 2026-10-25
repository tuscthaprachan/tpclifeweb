import { TIME_ZONE, type Locale } from "@/lib/i18n/config";

const TAG: Record<Locale, string> = { th: "th-TH", en: "en-GB" };

export function dayAndMonth(value: string, locale: Locale): { day: string; month: string } {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat(TAG[locale], { day: "numeric", timeZone: TIME_ZONE }).format(date),
    month: new Intl.DateTimeFormat(TAG[locale], { month: "short", timeZone: TIME_ZONE }).format(date),
  };
}
