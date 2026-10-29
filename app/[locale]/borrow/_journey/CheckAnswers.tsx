import type { ReactNode } from "react";
import { Button, Heading, Stack, SummaryList, type SummaryListRow } from "@/components/ui";
import type { InventoryCategory } from "@/lib/borrowing/availability";
import { periodOf } from "@/lib/borrowing/public/validate";
import { stepPath, type DraftValues } from "@/lib/borrowing/public/steps";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { sendJourney } from "./actions";
import { stepTitle } from "./copy";

interface CheckAnswersProps {
  locale: Locale;
  values: DraftValues;
  inventory: InventoryCategory[];
  facultyName?: string;
}

const lines = (text: string): ReactNode => <span className="whitespace-pre-line">{text}</span>;

/** The check your answers page: every answer grouped, a change link for each, and the one button that sends it. */
export function CheckAnswers({ locale, values, inventory, facultyName }: CheckAnswersProps) {
  const period = periodOf(values)!;
  const change = (step: string, what: string): ReactNode => (
    <a href={`${localePath(locale, stepPath(step))}?from=check`} className="text-action underline">
      {UI.brChange[locale]}
      <span className="visually-hidden"> {what}</span>
    </a>
  );
  const row = (key: string, value: ReactNode, step: string): SummaryListRow => ({ key, value, actions: change(step, key) });
  const chosen = inventory.flatMap((c) => c.items.filter((i) => values.items.includes(i.id)));
  const student = values.student === "yes";

  const groups: Array<{ heading: string; rows: SummaryListRow[] }> = [
    {
      heading: UI.brCheckWhen[locale],
      rows: [row(UI.brCollect[locale], formatDateTime(period.collectAt, locale), "dates"), row(UI.brReturn[locale], formatDateTime(period.returnAt, locale), "dates")],
    },
    {
      heading: UI.brCheckWhat[locale],
      rows: chosen.map((item) => row(pick({ th: item.nameTh, en: item.nameEn }, locale), `${values.quantities[item.id]} ${pick({ th: item.unitTh, en: item.unitEn }, locale)}`, "quantities")),
    },
    {
      heading: UI.brCheckWhatFor[locale],
      rows: [
        row(UI.brEventName[locale], values.eventName, "event"),
        row(UI.brVenue[locale], values.venue, "event"),
        row(UI.brPurpose[locale], lines(values.purpose), "event"),
        row(UI.brBorrowingFor[locale], values.borrower === "group" ? values.groupName : UI.brMyself[locale], "group"),
      ],
    },
    {
      heading: UI.brCheckYou[locale],
      rows: [
        row(UI.brName[locale], values.name, "details"),
        row(UI.brStudentQ[locale], (student ? UI.brYes : UI.brNo)[locale], "student"),
        ...(student
          ? [row(UI.brStudentId[locale], values.studentId, "details"), row(UI.brFaculty[locale], facultyName ?? "", "details")]
          : [row(UI.brAffiliation[locale], values.affiliation, "details")]),
        row(UI.brPhone[locale], values.phone, "contact"),
        row(UI.brEmail[locale], values.email || <span className="text-ink-600">{UI.brNotGiven[locale]}</span>, "contact"),
        row(UI.brTermsRow[locale], UI.brAgreed[locale], "terms"),
      ],
    },
  ];

  return (
    <Stack space={6}>
      <Heading level={1}>{stepTitle("check", locale)}</Heading>
      {groups.map((group) => (
        <Stack key={group.heading} space={2} as="section">
          <Heading level={2}>{group.heading}</Heading>
          <SummaryList rows={group.rows} />
        </Stack>
      ))}
      <p className="m-0">
        <a href={`${localePath(locale, stepPath("items"))}?from=check`} className="text-action underline">
          {UI.brChangeItems[locale]}
        </a>
      </p>
      <form action={sendJourney} noValidate>
        <input type="hidden" name="locale" value={locale} />
        {/* A field no person sees or reaches: aria-hidden, off the tab order and off screen. A script that fills it is refused. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto" }}>
          <label htmlFor="br-website">Website</label>
          <input id="br-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <Stack space={4}>
          <p className="m-0 text-ink-900">
            {UI.brCheckPrivacy[locale]}{" "}
            <a href={localePath(locale, "/borrow/privacy")} className="text-action underline">
              {UI.brPrivacyLink[locale]}
            </a>
          </p>
          <div>
            <Button type="submit">{UI.brSend[locale]}</Button>
          </div>
        </Stack>
      </form>
    </Stack>
  );
}
