import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export function HeroPurpose({ locale }: { locale: Locale }) {
  return <p className="m-0 mt-[var(--space-2)] max-w-[34rem] text-base sm:text-[length:var(--text-lg)] leading-snug text-ink-900">{UI.hlPurpose[locale]}</p>;
}
