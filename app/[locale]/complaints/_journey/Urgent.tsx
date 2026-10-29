import { Button, Container, Heading, Stack, WarningText } from "@/components/ui";
import { EMERGENCY_NUMBERS } from "@/lib/complaints/constants";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { ReactNode } from "react";
import { afterEmergency } from "./actions";
import { BackLink } from "./BackLink";
import { WellbeingBox } from "./WellbeingBox";

/**
 * Where "yes" to the first question ends: who to call, where to find support,
 * and a way to report it once everyone is safe. Nothing is stored about the
 * person; the draft holds the one answer.
 */
export function Urgent({ locale, crumbs, backHref }: { locale: Locale; crumbs: ReactNode; backHref: string }) {
  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <BackLink href={backHref} locale={locale} />
        <Heading level={1}>{UI.cpUrgentTitle[locale]}</Heading>
        <WarningText>
          <span className="visually-hidden">{UI.warning[locale]}: </span>
          {UI.cpUrgentBody[locale]}
        </WarningText>
        <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0 text-xl">
          {EMERGENCY_NUMBERS.map((n) => (
            <li key={n.number}>
              <span>{UI[n.number === "191" ? "cpEmergencyPolice" : "cpEmergencyMedical"][locale]}: </span>
              <a href={n.tel} className="font-bold text-action underline">
                {n.number}
              </a>
            </li>
          ))}
        </ul>
        <WellbeingBox locale={locale} />
        <Stack space={2} as="section">
          <Heading level={2}>{UI.cpUrgentLaterTitle[locale]}</Heading>
          <p className="m-0 text-ink-900">{UI.cpUrgentLaterBody[locale]}</p>
          <form action={afterEmergency} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="secondary">
              {UI.cpUrgentContinue[locale]}
            </Button>
          </form>
        </Stack>
        <ul className="m-0 flex list-none flex-col gap-[var(--space-1)] p-0">
          <li>
            <a href={localePath(locale, "/complaints/emergency")} className="text-action underline">
              {UI.cpSignStartAgain[locale]}
            </a>
          </li>
          <li>
            <a href={localePath(locale, "/report")} className="text-action underline">
              {UI.cpSignElse[locale]}
            </a>
          </li>
        </ul>
      </Stack>
    </Container>
  );
}
