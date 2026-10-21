import type { Locale } from "@/lib/i18n/config";
import type { CanteenDish } from "@/lib/sanity/types";
import { cx } from "@/components/ui/cx";
import { SpeakButton } from "./SpeakButton";
import { EAT, t } from "./strings";

interface HowToSayProps {
  dish: CanteenDish;
  locale: Locale;
  className?: string;
}

/**
 * English pages only: the dish's Thai name written in Latin letters, so a
 * student who cannot read Thai can say it at the counter, with a button that
 * reads the Thai aloud. In both languages it also gives the number the
 * stall's board uses, when it numbers its menu, since pointing at a number
 * always works. Renders nothing when there is neither.
 */
export function HowToSay({ dish, locale, className }: HowToSayProps) {
  const say = locale === "en" && dish.romanised ? dish.romanised : null;
  if (!say && !dish.menuNumber) return null;
  return (
    <div className={cx("flex flex-col text-sm text-ink-600", className)}>
      {say ? (
        <p className="m-0 flex flex-wrap items-center gap-x-[var(--space-1)]">
          <span>{t(EAT.sayLabel, locale)}</span>
          <span lang="th-Latn" className="font-medium italic text-ink-900">
            {say}
          </span>
          <SpeakButton text={dish.name.th} label={t(EAT.hearLabel, locale)} name={dish.name.en} className="-my-[var(--space-2)]" />
        </p>
      ) : null}
      {dish.menuNumber ? (
        <p className="m-0">
          {t(EAT.menuNumberLabel, locale)} <span className="font-medium text-ink-900">{dish.menuNumber}</span>
        </p>
      ) : null}
    </div>
  );
}
