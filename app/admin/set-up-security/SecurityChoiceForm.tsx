"use client";

import { useActionState } from "react";
import { useWebAuthnSupport } from "@/components/admin/PasskeyButton";
import { Button, ErrorSummary, Radios, Stack, type RadioOption } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { chooseMethod, type ChoiceState } from "./actions";

/**
 * The authenticator app is always offered. The passkey option is added only
 * once the browser reports WebAuthn support, so someone without JavaScript is
 * never offered a choice that cannot work for them.
 */
export function SecurityChoiceForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState<ChoiceState, FormData>(chooseMethod, {});
  const passkeys = useWebAuthnSupport();

  const options: RadioOption[] = [
    { value: "authenticator", label: a("optAuthenticator", locale), hint: a("optAuthenticatorHint", locale) },
    ...(passkeys ? [{ value: "passkey", label: a("optPasskey", locale), hint: a("optPasskeyHint", locale) }] : []),
  ];

  return (
    <form action={formAction} noValidate>
      <Stack space={6}>
        {state.error ? (
          <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#admin-method-0", message: state.error }]} />
        ) : null}
        <Radios
          id="admin-method"
          name="method"
          legend={a("setupLegend", locale)}
          options={options}
          defaultValue="authenticator"
          error={state.error}
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
