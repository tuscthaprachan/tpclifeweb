import Link from "next/link";
import type { ReactNode } from "react";
import { Button, Heading, InsetText, Stack, SummaryList, type SummaryListRow } from "@/components/ui";
import { stepPath, type DraftValues } from "@/lib/complaints/public/steps";
import { effectivePreferred } from "@/lib/complaints/public/validate";
import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { sendJourney } from "./actions";
import { stepTitle } from "./copy";

interface CheckAnswersProps {
  locale: Locale;
  values: DraftValues;
  category?: { name: string; restricted: boolean };
  fileNames: string[];
}

const lines = (text: string): ReactNode => <span className="whitespace-pre-line">{text}</span>;

/** The check your answers page: every answer, a change link for each, and the one button that sends it. */
export function CheckAnswers({ locale, values, category, fileNames }: CheckAnswersProps) {
  const change = (step: string, what: string): ReactNode => (
    <Link href={`${localePath(locale, stepPath(step))}?from=check`} className="text-action underline">
      {UI.cpChange[locale]}
      <span className="visually-hidden"> {what}</span>
    </Link>
  );
  const missing = <span className="text-ink-600">{UI.cpNotGiven[locale]}</span>;
  const rows: SummaryListRow[] = [];
  const add = (key: string, value: ReactNode, step: string) => rows.push({ key, value, actions: change(step, key) });

  add(UI.cpRowEmergency[locale], UI.cpEmergencyNo[locale], "emergency");
  add(UI.cpRowLevel[locale], (values.level === "unsure" ? UI.cpLevelUnsure : UI.cpLevelUniversity)[locale], "level");
  const identityLabel = values.identity === "named" ? UI.cpIdentityNamed : values.identity === "pseudonymous" ? UI.cpIdentityPseudonymous : UI.cpIdentityAnonymous;
  add(UI.cpRowIdentity[locale], identityLabel[locale], "identity");
  add(
    UI.cpRowCategory[locale],
    category ? (
      <>
        {category.name}
        {category.restricted ? <span className="mt-[var(--space-1)] block text-sm text-ink-600">{UI.cpRestrictedNote[locale]}</span> : null}
      </>
    ) : (
      missing
    ),
    "category",
  );
  add(UI.cpDescriptionLabel[locale], lines(values.description), "describe");
  add(UI.cpWhenLabel[locale], values.when || missing, "when");
  add(UI.cpWhereLabel[locale], values.where || missing, "when");
  add(UI.cpRemedyLabel[locale], values.remedy ? lines(values.remedy) : missing, "remedy");
  add(
    UI.cpRowEvidence[locale],
    fileNames.length > 0 ? (
      <ul className="m-0 list-none p-0">
        {fileNames.map((name, i) => (
          <li key={`${name}-${i}`} className="break-all">
            {name}
          </li>
        ))}
      </ul>
    ) : (
      missing
    ),
    "evidence",
  );

  if (values.identity !== "anonymous") {
    add(UI.cpNameLabel[locale], values.name || missing, "contact");
    add(UI.cpEmailLabel[locale], values.email || missing, "contact");
    add(UI.cpPhoneLabel[locale], values.phone || missing, "contact");
    add(UI.cpLineLabel[locale], values.lineId || missing, "contact");
    const preferred = effectivePreferred(values);
    if (preferred) add(UI.cpRowFirstContact[locale], (preferred === "email" ? UI.cpPreferredEmail : preferred === "phone" ? UI.cpPreferredPhone : UI.cpPreferredLine)[locale], "contact");
    add(UI.cpRowAgreement[locale], values.consent === "yes" ? UI.cpAgreed[locale] : missing, "contact");
  }

  return (
    <Stack space={6}>
      <Heading level={1}>{stepTitle("check", locale)}</Heading>
      <SummaryList rows={rows} />
      {values.identity === "anonymous" ? (
        <InsetText>
          <p className="m-0">{UI.cpCheckAnonymous[locale]}</p>
        </InsetText>
      ) : null}
      <form action={sendJourney} noValidate>
        <input type="hidden" name="locale" value={locale} />
        {/* A field no person sees or reaches: aria-hidden, off the tab order and off screen. A script that fills it is refused. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "auto" }}>
          <label htmlFor="cp-website">Website</label>
          <input id="cp-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <Stack space={4}>
          <p className="m-0 text-ink-900">
            {UI.cpCheckPrivacy[locale]}{" "}
            <Link href={localePath(locale, "/complaints/privacy")} className="text-action underline">
              {UI.cpPrivacyLink[locale]}
            </Link>
          </p>
          <div>
            <Button type="submit">{UI.cpSend[locale]}</Button>
          </div>
        </Stack>
      </form>
    </Stack>
  );
}
