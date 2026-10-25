import { InsetText, WarningText } from "@/components/ui";
import { EMERGENCY_NUMBERS } from "@/lib/complaints/constants";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/**
 * A complaint goes into a queue that is read in working hours. Anything that
 * cannot wait is routed around it: this box sits on the start page and the
 * confirmation and points to the existing emergency route and phone numbers.
 */
export function EmergencyBox({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="cp-emergency" className="rounded-panel border border-line-strong p-[var(--space-4)]">
      <h2 id="cp-emergency" className="m-0 text-xl font-bold text-ink-900">
        {UI.cpEmergencyTitle[locale]}
      </h2>
      <div className="mt-[var(--space-2)]">
        <WarningText>
          <span className="visually-hidden">{UI.warning[locale]}: </span>
          {UI.cpEmergencyBody[locale]}
        </WarningText>
      </div>
      <ul className="m-0 mt-[var(--space-3)] flex list-none flex-col gap-[var(--space-2)] p-0">
        <li>
          <a href={localePath(locale, "/report")} className="font-semibold text-action underline">
            {UI.cpEmergencyRoute[locale]}
          </a>
        </li>
        {EMERGENCY_NUMBERS.map((n) => (
          <li key={n.number}>
            <span>{UI[n.number === "191" ? "cpEmergencyPolice" : "cpEmergencyMedical"][locale]}: </span>
            <a href={n.tel} className="font-semibold text-action underline">
              {n.number}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The same advice in one line, for pages where the full box would crowd the question. */
export function EmergencyLine({ locale }: { locale: Locale }) {
  return (
    <InsetText>
      <p className="m-0">
        {UI.cpEmergencyShort[locale]}{" "}
        <a href={localePath(locale, "/report")} className="text-action underline">
          {UI.cpEmergencyRoute[locale]}
        </a>
      </p>
    </InsetText>
  );
}
