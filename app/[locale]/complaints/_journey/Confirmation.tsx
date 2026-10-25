import type { ReactNode } from "react";
import { Button, Heading, InsetText, NotificationBanner, Panel, Stack, WarningText, Container } from "@/components/ui";
import { getConfirmationFacts } from "@/lib/complaints/public/confirmation";
import { siteOrigin } from "@/lib/complaints/public/cookies";
import type { JourneyResult } from "@/lib/complaints/public/store";
import { trackingLinkUrl } from "@/lib/complaints/public/track";
import { getDb } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { emailLink } from "./actions";
import { stepTitle } from "./copy";
import { EmergencyBox } from "./EmergencyBox";
import { WellbeingBox } from "./WellbeingBox";

interface ConfirmationProps {
  locale: Locale;
  result: JourneyResult;
  email?: string;
  crumbs: ReactNode;
}

/**
 * The confirmation panel: the reference, the private tracking link (shown here
 * and not again, with clear advice to keep it, and a stronger warning for an
 * anonymous complaint, where it is the only way back), an optional email of the
 * link, the wellbeing centre's details where the category offers them, and what
 * happens next with the target dates.
 */
export async function Confirmation({ locale, result, email, crumbs }: ConfirmationProps) {
  const link = trackingLinkUrl(locale, result.reference, result.token, await siteOrigin());
  const facts = await getConfirmationFacts(getDb(), result.reference);
  const anonymous = result.identity === "anonymous";
  const canEmail = !anonymous && isEmailConfigured() && Boolean(result.email) && !result.emailed;

  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Panel headingLevel={1} title={stepTitle("confirmation", locale)} tone="success">
          <p className="m-0">{UI.cpYourReference[locale]}</p>
          <p className="m-0 mt-[var(--space-2)] text-3xl font-bold">{result.reference}</p>
        </Panel>

        <Stack space={3} as="section">
          <Heading level={2}>{UI.cpKeepLinkTitle[locale]}</Heading>
          <p className="m-0">{(anonymous ? UI.cpKeepLinkBodyAnonymous : UI.cpKeepLinkBody)[locale]}</p>
          <WarningText>
            <span className="visually-hidden">{UI.warning[locale]}: </span>
            {(anonymous ? UI.cpKeepLinkWarningAnonymous : UI.cpKeepLinkWarning)[locale]}
          </WarningText>
          <InsetText>
            <p className="m-0 text-sm text-ink-600">{UI.cpYourLink[locale]}</p>
            <p className="m-0 break-all">
              <a href={link} className="text-action underline">
                {link}
              </a>
            </p>
          </InsetText>
          <div>
            <Button href={link} variant="secondary">
              {UI.cpOpenTracking[locale]}
            </Button>
          </div>
        </Stack>

        {email === "sent" || result.emailed ? (
          <NotificationBanner variant="success" title={UI.cpEmailSent[locale]}>
            {null}
          </NotificationBanner>
        ) : null}
        {email === "failed" ? (
          <NotificationBanner variant="warning" title={UI.cpEmailFailed[locale]}>
            {null}
          </NotificationBanner>
        ) : null}
        {canEmail ? (
          <form action={emailLink} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Stack space={3}>
              <p className="m-0">{UI.cpEmailOffer[locale]}</p>
              <div>
                <Button type="submit" variant="secondary">
                  {UI.cpEmailButton[locale]}
                </Button>
              </div>
            </Stack>
          </form>
        ) : null}

        {facts?.category.offerWellbeing ? <WellbeingBox locale={locale} /> : null}

        <Stack space={3} as="section">
          <Heading level={2}>{UI.cpWhatNext[locale]}</Heading>
          <ol className="m-0 flex list-decimal flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>
              {facts ? UI.cpNextAcknowledge[locale].replace("{date}", formatDate(facts.acknowledgeDueAt, locale)) : UI.cpNextAcknowledgeNoDate[locale]}
            </li>
            <li>{facts ? UI.cpNextResolve[locale].replace("{date}", formatDate(facts.resolveDueAt, locale)) : UI.cpNextResolveNoDate[locale]}</li>
            <li>{UI.cpNextTrack[locale]}</li>
            <li>{(facts?.category.restricted ? UI.cpNextWho : UI.cpNextWhoShared)[locale]}</li>
          </ol>
          {facts ? <p className="m-0 text-sm text-ink-600">{UI.cpTargetNote[locale]}</p> : null}
          {facts ? <p className="m-0 text-sm text-ink-600">{pick(facts.category.name, locale)}</p> : null}
          <p className="m-0">
            <a href={localePath(locale, "/complaints/privacy")} className="text-action underline">
              {UI.cpPrivacyLink[locale]}
            </a>
          </p>
        </Stack>

        <EmergencyBox locale={locale} />
      </Stack>
    </Container>
  );
}
