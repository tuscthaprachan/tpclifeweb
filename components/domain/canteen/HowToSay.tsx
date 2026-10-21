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
 * English pages only: what to say at the counter, in Latin letters, with a
 * button that reads the Thai aloud. A dish that offers a choice (pork or
 * chicken) gives one phrase per choice, since the stall needs you to pick. In both languages it also gives the number the
 * stall's board uses, when it numbers its menu, since pointing at a number
 * always works. Renders nothing when there is neither.
 */
export function HowToSay({ dish, locale, className }: HowToSayProps) {
  const say = locale === "en" ? (dish.sayAs ?? []) : [];
  if (say.length === 0 && !dish.menuNumber) return null;
  return (
    <div className={cx("flex flex-col text-sm text-ink-600", className)}>
      {say.length > 0 ? (
        <p className="m-0 flex flex-wrap items-center gap-x-[var(--space-1)]">
          <span>{t(say.length > 1 ? EAT.sayOneOf : EAT.sayLabel, locale)}</span>
          {say.map((phrase, i) => (
            <span key={phrase._key} className="inline-flex items-center gap-x-[var(--space-1)]">
              {i > 0 ? <span>{t(EAT.orWord, locale)}</span> : null}
              <span lang="th-Latn" className="font-medium italic text-ink-900">
                {phrase.romanised}
              </span>
              <SpeakButton text={phrase.th} label={t(EAT.hearLabel, locale)} name={phrase.romanised} className="-my-[var(--space-2)]" />
            </span>
          ))}
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
