import type { ReactNode } from "react";
import { Button, Container, Heading, InsetText, NotificationBanner, Panel, Stack, WarningText } from "@/components/ui";
import { siteOrigin } from "@/lib/borrowing/public/cookies";
import type { JourneyResult } from "@/lib/borrowing/public/store";
import { trackingLinkUrl } from "@/lib/borrowing/public/track";
import { isEmailConfigured } from "@/lib/email";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { emailLink } from "./actions";
import { stepTitle } from "./copy";

interface ConfirmationProps {
  locale: Locale;
  result: JourneyResult;
  email?: string;
  crumbs: ReactNode;
}

/**
 * The confirmation panel: the reference, the private tracking link (shown here
 * and not again, with clear advice to keep it), an optional email of the link,
 * and what happens next with the collection time and the cards to bring.
 */
export async function Confirmation({ locale, result, email, crumbs }: ConfirmationProps) {
  const link = trackingLinkUrl(locale, result.reference, result.token, await siteOrigin());
  const canEmail = isEmailConfigured() && Boolean(result.email) && !result.emailed;
  const collect = formatDateTime(result.collectAt, locale);

  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Panel headingLevel={1} title={stepTitle("confirmation", locale)} tone="success">
          <p className="m-0">{UI.brYourReference[locale]}</p>
          <p className="m-0 mt-[var(--space-2)] text-3xl font-bold">{result.reference}</p>
        </Panel>

        <Stack space={3} as="section">
          <Heading level={2}>{UI.brWhatNext[locale]}</Heading>
          <ol className="m-0 flex list-decimal flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            <li>{UI.brNextDecide[locale]}</li>
            <li>{UI.brNextEmail[locale]}</li>
            <li>{UI.brNextCollect[locale].replace("{when}", collect)}</li>
            {result.cards > 0 ? <li>{(result.cards === 1 ? UI.brBringCardOne : UI.brBringCards)[locale].replace("{n}", String(result.cards))}</li> : null}
            <li>{UI.brNextCancel[locale]}</li>
          </ol>
        </Stack>

        <Stack space={3} as="section">
          <Heading level={2}>{UI.brKeepLinkTitle[locale]}</Heading>
          <p className="m-0">{UI.brKeepLinkBody[locale]}</p>
          <WarningText>
            <span className="visually-hidden">{UI.warning[locale]}: </span>
            {UI.brKeepLinkWarning[locale]}
          </WarningText>
          <InsetText>
            <p className="m-0 text-sm text-ink-600">{UI.brYourLink[locale]}</p>
            <p className="m-0 break-all">
              <a href={link} className="text-action underline">
                {link}
              </a>
            </p>
          </InsetText>
          <div>
            <Button href={link} variant="secondary">
              {UI.brOpenTracking[locale]}
            </Button>
          </div>
        </Stack>

        {email === "sent" || result.emailed ? (
          <NotificationBanner variant="success" title={UI.brEmailSent[locale]}>
            {null}
          </NotificationBanner>
        ) : null}
        {email === "failed" ? (
          <NotificationBanner variant="warning" title={UI.brEmailFailed[locale]}>
            {null}
          </NotificationBanner>
        ) : null}
        {canEmail ? (
          <form action={emailLink} noValidate>
            <input type="hidden" name="locale" value={locale} />
            <Stack space={3}>
              <p className="m-0">{UI.brEmailOffer[locale]}</p>
              <div>
                <Button type="submit" variant="secondary">
                  {UI.brEmailButton[locale]}
                </Button>
              </div>
            </Stack>
          </form>
        ) : null}

        <p className="m-0">
          <a href={localePath(locale, "/borrow/privacy")} className="text-action underline">
            {UI.brPrivacyLink[locale]}
          </a>
        </p>
      </Stack>
    </Container>
  );
}
