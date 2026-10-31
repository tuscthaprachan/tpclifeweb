import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

const TAG: Record<Locale, string> = { th: "th-TH", en: "en-GB" };

/** "1,988,223.24": always two decimals, Latin digits, grouped by thousands. */
export function formatMoneyAmount(value: number | string, locale: Locale): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat(TAG[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

/** "1,988,223.24 บาท" / "1,988,223.24 baht". Amounts are shown as published, never rounded to whole baht. */
export function formatMoney(value: number | string, locale: Locale): string {
  return `${formatMoneyAmount(value, locale)} ${UI.odMoneyUnit[locale]}`;
}
