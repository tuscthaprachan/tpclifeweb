import { Details } from "@/components/ui/Details";
import { Timestamp } from "@/components/ui/Timestamp";
import { cx } from "@/components/ui/cx";
import { pick, type Locale } from "@/lib/i18n/config";
import type { DishVariant } from "@/lib/sanity/types";
import { EAT, eat, t } from "./strings";

interface PriceTagProps {
  /** Base price in baht, as surveyed. */
  price: number;
  variants?: DishVariant[];
  /** "YYYY-MM-DD", the day the price was read off the board. Always shown when given, and it should always be given. */
  checkedOn?: string;
  locale: Locale;
  /**
   * "compact" is for cards: the price, a note that extras exist, the date.
   * "full" is for the dish page: the price and a Details with every option.
   */
  size?: "compact" | "full";
  className?: string;
}

/**
 * A surveyed price. It always carries the day it was checked and never says
 * "current" or "live": the figure is what the board said on that day.
 */
export function PriceTag({ price, variants = [], checkedOn, locale, size = "compact", className }: PriceTagProps) {
  const hasVariants = variants.length > 0;
  return (
    <div className={cx("flex flex-col gap-[var(--space-1)]", className)}>
      <p className={cx("m-0 font-semibold text-ink-900", size === "full" ? "text-3xl" : "text-xl")}>{eat.baht(locale, price)}</p>

      {size === "compact" && hasVariants ? <p className="m-0 text-sm text-ink-600">{t(EAT.extrasFrom, locale)}</p> : null}

      {checkedOn ? (
        <p className="m-0 text-sm text-ink-600">
          {t(EAT.priceCheckedOn, locale)} <Timestamp value={checkedOn} locale={locale} />
        </p>
      ) : null}

      {size === "full" && hasVariants ? (
        <Details summary={t(EAT.optionsTitle, locale)} className="mt-[var(--space-2)]">
          <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
            <li className="flex flex-wrap justify-between gap-x-[var(--space-4)]">
              <span>{t(EAT.baseWord, locale)}</span>
              <span className="font-medium">{eat.baht(locale, price)}</span>
            </li>
            {variants.map((variant) => (
              <li key={variant._key} className="flex flex-wrap justify-between gap-x-[var(--space-4)]">
                <span>
                  {pick(variant.label, locale)} ({eat.plusBaht(locale, variant.delta)})
                </span>
                <span className="font-medium">{eat.baht(locale, price + variant.delta)}</span>
              </li>
            ))}
          </ul>
        </Details>
      ) : null}
    </div>
  );
}
