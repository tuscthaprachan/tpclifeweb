"use client";

import { useActionState, type ReactNode } from "react";
import { Button, ErrorSummary, Stack, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { confirmAuthenticator, type ConfirmState } from "../actions";

/** Step 3 of the authenticator setup: check a code from the app. On success the action redirects to the backup codes. */
export function ConfirmForm({ locale, intro }: { locale: Locale; intro: ReactNode }) {
  const [state, formAction, pending] = useActionState<ConfirmState, FormData>(confirmAuthenticator, {});

  return (
    <form action={formAction} noValidate>
      <Stack space={6}>
        {intro}
        {state.error ? (
          <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#admin-confirm-code", message: state.error }]} />
        ) : null}
        <TextInput
          id="admin-confirm-code"
          name="code"
          label={a("codeLabel", locale)}
          hint={a("authStep3", locale)}
          error={state.error}
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          className="max-w-[12rem]"
        />
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("authConfirmButton", locale)}>
            {a("authConfirmButton", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
