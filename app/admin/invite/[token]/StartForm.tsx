"use client";

import { useActionState } from "react";
import { Button, ErrorSummary, Stack } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { startInviteSignIn, type StartState } from "./actions";

export function StartForm({ locale, token }: { locale: Locale; token: string }) {
  const [state, formAction, pending] = useActionState<StartState, FormData>(startInviteSignIn, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <Stack space={6}>
        {state.error ? (
          <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#admin-invite-start", message: state.error }]} />
        ) : null}
        <div>
          <Button id="admin-invite-start" type="submit" loading={pending} loadingLabel={a("inviteLandingContinue", locale)}>
            {a("inviteLandingContinue", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
