import { ErrorMessage } from "@/components/ui";
import { describedBy } from "@/lib/a11y";
import { freeFor, periodOf, type ValidationContext } from "@/lib/borrowing/public/validate";
import { quantityField, type DraftValues } from "@/lib/borrowing/public/steps";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { Question } from "./Question";

type Err = (field: string) => string | undefined;

interface QuantitiesStepProps {
  locale: Locale;
  title: string;
  values: DraftValues;
  ctx: ValidationContext;
  err: Err;
}

/** One whole-number box per chosen item, with its unit after it and the most that can be asked for as its hint. */
export function QuantitiesStep({ locale, title, values, ctx, err }: QuantitiesStepProps) {
  const period = periodOf(values)!;
  const chosen = ctx.inventory.flatMap((category) => category.items.filter((i) => values.items.includes(i.id)).map((item) => ({ category, item })));
  const capped = [...new Map(chosen.filter(({ category }) => category.maxPerRequest != null).map(({ category }) => [category.id, category])).values()];

  return (
    <>
      <Question>{title}</Question>
      {capped.map((category) => (
        <p key={category.id} className="m-0 text-ink-900">
          {UI.brCategoryCap[locale].replace("{category}", pick({ th: category.nameTh, en: category.nameEn }, locale)).replace("{max}", String(category.maxPerRequest))}
        </p>
      ))}
      {chosen.map(({ item }) => {
        const id = quantityField(item.id);
        const error = err(id);
        const max = Math.min(freeFor(item, ctx, period), item.maxPerRequest ?? Number.POSITIVE_INFINITY);
        const unit = pick({ th: item.unitTh, en: item.unitEn }, locale);
        return (
          <div key={item.id} className="flex flex-col gap-[var(--space-1)]">
            <label htmlFor={id} className="text-base font-medium text-ink-900">
              {pick({ th: item.nameTh, en: item.nameEn }, locale)}
            </label>
            <p id={`${id}-hint`} className="m-0 text-sm text-ink-600">
              {UI.brUpTo[locale].replace("{max}", String(max))}
            </p>
            {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
            <div className="flex items-center gap-[var(--space-2)]">
              <input
                id={id}
                name={id}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                defaultValue={values.quantities[item.id] ?? ""}
                aria-describedby={describedBy(id, { hasHint: true, hasError: Boolean(error) })}
                aria-invalid={error ? true : undefined}
                className={`min-h-[var(--target-min)] w-24 rounded-control bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900 ${error ? "border-[length:var(--border-width-thick)] border-error" : "border border-line-strong"}`}
              />
              <span className="text-base text-ink-900">{unit}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
