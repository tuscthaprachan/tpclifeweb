import type { ReactNode } from "react";
import { Button, Container, Heading, InsetText, NotificationBanner, Panel, Stack, WarningText } from "@/components/ui";
import { isEmailConfigured } from "@/lib/email";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { siteOrigin } from "@/lib/lost-found/public/cookies";
import type { JourneyKind } from "@/lib/lost-found/public/steps";
import type { JourneyResult } from "@/lib/lost-found/public/store";
import { trackingLinkUrl } from "@/lib/lost-found/public/track";
import { emailLink } from "./actions";
import { stepTitle } from "./copy";

interface ConfirmationProps {
  kind: JourneyKind;
  locale: Locale;
  slug?: string;
  result: JourneyResult;
  email?: string;
  crumbs: ReactNode;
}

const NEXT = {
  lost: ["lfpNextLost1", "lfpNextLost2", "lfpNextLost3"],
  found: ["lfpNextFound1", "lfpNextFound2", "lfpNextFound3"],
  claim: ["lfpNextClaim1", "lfpNextClaim2", "lfpNextClaim3"],
} as const;

/**
 * The confirmation panel: the reference, the private tracking link (shown
 * here and not again, with clear advice to keep it), an optional email of the
 * link, and what happens next.
 */
export async function Confirmation({ kind, locale, slug, result, email, crumbs }: ConfirmationProps) {
  const link = trackingLinkUrl(locale, result.reference, result.token, await siteOrigin());
  const canEmail = isEmailConfigured() && Boolean(result.email) && !result.emailed;

  return (
    <Container width="narrow">
      {crumbs}
      <Stack space={6} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Panel headingLevel={1} title={stepTitle(kind, "confirmation", locale)} tone="success">
          <p className="m-0">{UI.lfpYourReference[locale]}</p>
          <p className="m-0 mt-[var(--space-2)] text-3xl font-bold">{result.reference}</p>
        </Panel>

        <Stack space={3} as="section">
          <Heading level={2}>{UI.lfpKeepLinkTitle[locale]}</Heading>
          <p className="m-0">{UI.lfpKeepLinkBody[locale]}</p>
          <WarningText>
            <span className="visually-hidden">{UI.warning[locale]}: </span>
            {UI.lfpKeepLinkWarning[locale]}
          </WarningText>
          <InsetText>
            <p className="m-0 text-sm text-ink-600">{UI.lfpYourLink[locale]}</p>
            <p className="m-0 break-all">
              <a href={link} className="text-action underline">
                {link}
              </a>
            </p>
          </InsetText>
          <div>
            <Button href={link} variant="secondary">
              {UI.lfpOpenTracking[locale]}
            </Button>
          </div>
        </Stack>

        {email === "sent" || result.emailed ? <NotificationBanner variant="success" title={UI.lfpEmailSent[locale]}>{null}</NotificationBanner> : null}
        {email === "failed" ? (
          <NotificationBanner variant="warning" title={UI.lfpEmailFailed[locale]}>
            {null}
          </NotificationBanner>
        ) : null}
        {canEmail ? (
          <form action={emailLink} noValidate>
            <input type="hidden" name="journey" value={kind} />
            <input type="hidden" name="locale" value={locale} />
            {slug ? <input type="hidden" name="slug" value={slug} /> : null}
            <Stack space={3}>
              <p className="m-0">{UI.lfpEmailOffer[locale]}</p>
              <div>
                <Button type="submit" variant="secondary">
                  {UI.lfpEmailButton[locale]}
                </Button>
              </div>
            </Stack>
          </form>
        ) : null}

        <Stack space={3} as="section">
          <Heading level={2}>{UI.lfpWhatNext[locale]}</Heading>
          <ol className="m-0 flex list-decimal flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
            {NEXT[kind].map((key) => (
              <li key={key}>{UI[key][locale]}</li>
            ))}
          </ol>
          <p className="m-0">
            <a href={localePath(locale, "/lost-and-found/privacy")} className="text-action underline">
              {UI.lfpPrivacyLink[locale]}
            </a>
          </p>
        </Stack>
      </Stack>
    </Container>
  );
}
