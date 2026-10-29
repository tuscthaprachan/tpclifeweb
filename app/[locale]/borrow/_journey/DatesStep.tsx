import Link from "next/link";
import { DateInput, InsetText, Select, Stack } from "@/components/ui";
import { deskSlots } from "@/lib/borrowing/time";
import { shortestNotice } from "@/lib/borrowing/rules";
import { earliestDay, type ValidationContext } from "@/lib/borrowing/public/validate";
import type { DraftValues } from "@/lib/borrowing/public/steps";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { dayStart } from "@/lib/borrowing/time";
import { Question } from "./Question";

type Err = (field: string) => string | undefined;

interface DatesStepProps {
  locale: Locale;
  title: string;
  values: DraftValues;
  ctx: Pick<ValidationContext, "now" | "inventory">;
  err: Err;
}

/** The period: a collection and a return, each a date and a time the desk is open. */
export function DatesStep({ locale, title, values, ctx, err }: DatesStepProps) {
  const notice = shortestNotice(ctx.inventory);
  const earliest = earliestDay(ctx);
  const [year, month, day] = earliest.split("-");
  const example = `${Number(day)} ${Number(month)} ${locale === "th" ? Number(year) + 543 : year}`;
  const longer = ctx.inventory.filter((c) => c.noticeWorkingDays > notice);
  const slots = [{ value: "", label: UI.brChooseTime[locale] }, ...deskSlots().map((t) => ({ value: t, label: t }))];
  const labels = { dayLabel: UI.day[locale], monthLabel: UI.month[locale], yearLabel: UI.year[locale] };
  const dateHint = UI.brDateHint[locale].replace("{example}", example);

  return (
    <>
      <Question>{title}</Question>
      <InsetText>
        <p className="m-0">{UI.brNoticeRule[locale].replace("{n}", String(notice)).replace("{date}", formatDate(dayStart(earliest), locale))}</p>
        {longer.map((c) => (
          <p key={c.id} className="m-0 mt-[var(--space-1)]">
            {UI.brNoticeLonger[locale].replace("{category}", pick({ th: c.nameTh, en: c.nameEn }, locale)).replace("{n}", String(c.noticeWorkingDays))}
          </p>
        ))}
        <p className="m-0 mt-[var(--space-1)]">
          {UI.brDeskHours[locale]}{" "}
          <Link href={localePath(locale, "/borrow/availability")} className="text-action underline">
            {UI.brSeeAvailability[locale]}
          </Link>
        </p>
      </InsetText>
      <Stack space={4}>
        <DateInput id="collect" legend={UI.brCollectDate[locale]} hint={dateHint} error={err("collect")} defaultValue={{ day: values.collectDay, month: values.collectMonth, year: values.collectYear }} {...labels} />
        <Select id="collectTime" name="collectTime" label={UI.brCollectTime[locale]} error={err("collectTime")} defaultValue={values.collectTime} options={slots} />
      </Stack>
      <Stack space={4}>
        <DateInput id="return" legend={UI.brReturnDate[locale]} hint={dateHint} error={err("return")} defaultValue={{ day: values.returnDay, month: values.returnMonth, year: values.returnYear }} {...labels} />
        <Select id="returnTime" name="returnTime" label={UI.brReturnTime[locale]} error={err("returnTime")} defaultValue={values.returnTime} options={slots} />
      </Stack>
    </>
  );
}
