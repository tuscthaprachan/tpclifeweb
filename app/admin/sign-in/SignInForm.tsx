"use client";

import { useActionState } from "react";
import { Button, ErrorSummary, Stack, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { requestCode, type EmailFormState } from "./actions";

export function SignInForm({ locale, initialEmail = "" }: { locale: Locale; initialEmail?: string }) {
  const [state, formAction, pending] = useActionState<EmailFormState, FormData>(requestCode, { email: initialEmail });

  return (
    <form action={formAction} noValidate>
      <Stack space={6}>
        {state.error ? (
          <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#admin-email", message: state.error }]} />
        ) : null}
        <TextInput
          id="admin-email"
          name="email"
          type="email"
          label={a("emailLabel", locale)}
          hint={a("emailHint", locale)}
          defaultValue={state.email}
          error={state.error}
          autoComplete="email"
          spellCheck={false}
          autoCapitalize="none"
        />
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("continue", locale)}>
            {a("continue", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
