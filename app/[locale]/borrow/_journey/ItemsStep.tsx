import Link from "next/link";
import { Fieldset, InsetText, NotificationBanner, Stack } from "@/components/ui";
import { hasNotice, earliestFor } from "@/lib/borrowing/rules";
import { dayStart } from "@/lib/borrowing/time";
import { freeFor, periodOf, type ValidationContext } from "@/lib/borrowing/public/validate";
import { stepPath, type DraftValues } from "@/lib/borrowing/public/steps";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { ErrorMessage } from "@/components/ui";
import { Question } from "./Question";

type Err = (field: string) => string | undefined;

interface ItemsStepProps {
  locale: Locale;
  title: string;
  values: DraftValues;
  ctx: ValidationContext;
  fromCheck: boolean;
  err: Err;
}

/** Checkboxes grouped by category. What cannot be lent for the dates is shown as plain text with the reason, never as a choice. */
export function ItemsStep({ locale, title, values, ctx, fromCheck, err }: ItemsStepProps) {
  const period = periodOf(values)!;
  const changeDates = localePath(locale, stepPath("dates")) + (fromCheck ? "?from=check" : "");
  const categories = ctx.inventory.filter((c) => c.items.length > 0);
  const anyFree = categories.some((c) => hasNotice(c, period.collectAt, ctx.now) && c.items.some((i) => freeFor(i, ctx, period) > 0));

  return (
    <>
      <Stack space={2}>
        <Question>{title}</Question>
        <p className="m-0 text-ink-600">{UI.brItemsHint[locale]}</p>
      </Stack>
      {!anyFree ? (
        <NotificationBanner variant="info" title={UI.brNothingFreeTitle[locale]}>
          {UI.brNothingFree[locale]}{" "}
          <Link href={changeDates} className="text-action underline">
            {UI.brChangeDates[locale]}
          </Link>
        </NotificationBanner>
      ) : null}
      <div id="items" tabIndex={-1} className="flex flex-col gap-[var(--space-6)]">
        {err("items") ? <ErrorMessage id="items-error">{err("items")}</ErrorMessage> : null}
        {categories.map((category) => {
          const noticeOk = hasNotice(category, period.collectAt, ctx.now);
          const id = `cat-${category.key}`;
          const hint = pick({ th: category.hintTh, en: category.hintEn }, locale);
          return (
            <Fieldset key={category.id} id={id} legend={pick({ th: category.nameTh, en: category.nameEn }, locale)} hint={hint || undefined}>
              {!noticeOk ? (
                <InsetText>
                  <p className="m-0">
                    {UI.brCategoryNotice[locale].replace("{n}", String(category.noticeWorkingDays)).replace("{date}", formatDate(dayStart(earliestFor(category, ctx.now)), locale))}{" "}
                    <Link href={changeDates} className="text-action underline">
                      {UI.brChangeDates[locale]}
                    </Link>
                  </p>
                </InsetText>
              ) : null}
              <div className="mt-[var(--space-2)] flex flex-col gap-[var(--space-3)]">
                {category.items.map((item, index) => {
                  const free = noticeOk ? freeFor(item, ctx, period) : 0;
                  const name = pick({ th: item.nameTh, en: item.nameEn }, locale);
                  const unit = pick({ th: item.unitTh, en: item.unitEn }, locale);
                  const detail = pick({ th: item.hintTh, en: item.hintEn }, locale);
                  if (free < 1) {
                    return (
                      <p key={item.id} className="m-0 text-ink-600">
                        <span className="font-medium">{name}</span>
                        <span className="block text-sm">{noticeOk ? UI.brNoneFree[locale] : UI.brNotForDates[locale]}</span>
                      </p>
                    );
                  }
                  const optionId = `${id}-${index}`;
                  return (
                    <div key={item.id} className="flex min-h-[var(--target-min)] items-start gap-[var(--space-2)]">
                      <input
                        type="checkbox"
                        id={optionId}
                        name="items"
                        value={item.id}
                        defaultChecked={values.items.includes(item.id)}
                        className="m-0 mt-[calc((var(--target-min)-1.25rem)/2)] size-5 min-h-0 min-w-0 shrink-0"
                      />
                      <label htmlFor={optionId} className="flex min-h-[var(--target-min)] flex-1 flex-col justify-center text-base text-ink-900">
                        {name}
                        <span className="block text-sm text-ink-600">{UI.brFreeForDates[locale].replace("{n}", String(free)).replace("{unit}", unit)}</span>
                        {detail ? <span className="block text-sm text-ink-600">{detail}</span> : null}
                      </label>
                    </div>
                  );
                })}
              </div>
            </Fieldset>
          );
        })}
      </div>
    </>
  );
}
