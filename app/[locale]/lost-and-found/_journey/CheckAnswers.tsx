import type { ReactNode } from "react";
import { categoryLabel } from "@/components/domain/lostfound";
import { Button, Heading, Stack, SummaryList, type SummaryListRow } from "@/components/ui";
import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { stepPath, type DraftValues, type JourneyKind } from "@/lib/lost-found/public/steps";
import { effectivePreferred, parseDate } from "@/lib/lost-found/public/validate";
import type { LostFoundCategory } from "@/lib/content/types";
import { sendJourney } from "./actions";
import { stepTitle } from "./copy";

interface CheckAnswersProps {
  kind: JourneyKind;
  locale: Locale;
  slug?: string;
  values: DraftValues;
  placeName?: string;
}

const lines = (text: string): ReactNode => <span className="whitespace-pre-line">{text}</span>;

/** The check your answers page: every answer, a change link for each, and the one button that sends it. */
export function CheckAnswers({ kind, locale, slug, values, placeName }: CheckAnswersProps) {
  const change = (step: string, what: string): ReactNode => (
    <a href={`${localePath(locale, stepPath(kind, step, slug))}?from=check`} className="text-action underline">
      {UI.lfpChange[locale]}
      <span className="visually-hidden"> {what}</span>
    </a>
  );
  const found = kind === "found";
  const rows: SummaryListRow[] = [];
  const add = (key: string, value: ReactNode, step: string) => rows.push({ key, value, actions: change(step, key) });

  if (kind !== "claim") {
    add(UI.category[locale], categoryLabel(values.category as LostFoundCategory, locale), "category");
    add(UI.lfpTitleLabel[locale], values.title, "describe");
    add(UI.lfpDescriptionLabel[locale], lines(values.description), "describe");
    add((found ? UI.whereFound : UI.whereLost)[locale], [placeName, values.locationNote].filter(Boolean).join(", "), "where");
    const date = parseDate(values.day, values.month, values.year);
    add((found ? UI.dateFound : UI.dateLost)[locale], date ? formatDate(date, locale) : "", "when");
    if (kind === "lost") {
      add(
        UI.lfpRowDetail[locale],
        <>
          {lines(values.detail)}
          <span className="mt-[var(--space-1)] block text-sm text-ink-600">{UI.lfpPrivateNote[locale]}</span>
        </>,
        "detail",
      );
    } else {
      const label = values.whereNow === "will_hand_in" ? UI.lfpWhereNowHandIn : values.whereNow === "left_there" ? UI.lfpWhereNowLeftThere : UI.lfpWhereNowNeedHelp;
      add(UI.lfpRowWhereNow[locale], label[locale], "now");
    }
  } else {
    add(
      UI.lfpRowProof[locale],
      <>
        {lines(values.proof)}
        <span className="mt-[var(--space-1)] block text-sm text-ink-600">{UI.lfpPrivateNote[locale]}</span>
      </>,
      "proof",
    );
  }

  const anyContact = Boolean(values.name || values.email || values.phone || values.lineId);
  if (anyContact || kind !== "found") {
    const missing = <span className="text-ink-600">{UI.lfpNotGiven[locale]}</span>;
    add(UI.lfpNameLabel[locale], values.name || missing, "contact");
    add(UI.lfpEmailLabel[locale], values.email || missing, "contact");
    add(UI.lfpPhoneLabel[locale], values.phone || missing, "contact");
    add(UI.lfpLineLabel[locale], values.lineId || missing, "contact");
    const preferred = effectivePreferred(values);
    if (preferred) add(UI.lfpRowFirstContact[locale], (preferred === "email" ? UI.lfpPreferredEmail : preferred === "phone" ? UI.lfpPreferredPhone : UI.lfpPreferredLine)[locale], "contact");
    add(UI.lfpRowAgreement[locale], values.consent === "yes" ? UI.lfpAgreed[locale] : missing, "contact");
  } else {
    add(UI.lfpRowContact[locale], <span className="text-ink-600">{UI.lfpNotGiven[locale]}</span>, "contact");
  }

  return (
    <Stack space={6}>
      <Heading level={1}>{stepTitle(kind, "check", locale)}</Heading>
      <SummaryList rows={rows} />
      <form action={sendJourney} noValidate>
        <input type="hidden" name="journey" value={kind} />
        <input type="hidden" name="locale" value={locale} />
        {slug ? <input type="hidden" name="slug" value={slug} /> : null}
        {/* A field no person sees or reaches: aria-hidden, off the tab order and off screen. A script that fills it is refused. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto" }}>
          <label htmlFor="lfp-website">Website</label>
          <input id="lfp-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <Stack space={4}>
          <p className="m-0 text-ink-900">
            {UI.lfpCheckPrivacy[locale]}{" "}
            <a href={localePath(locale, "/lost-and-found/privacy")} className="text-action underline">
              {UI.lfpPrivacyLink[locale]}
            </a>
          </p>
          <div>
            <Button type="submit">{(kind === "claim" ? UI.lfpSendClaim : UI.lfpSendReport)[locale]}</Button>
          </div>
        </Stack>
      </form>
    </Stack>
  );
}
