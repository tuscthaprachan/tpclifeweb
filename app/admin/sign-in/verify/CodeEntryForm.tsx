"use client";

/**
 * One text field and a button, posting to a second-step Server Action. Used for
 * the authenticator code and for a backup code, which differ only in copy and
 * in the field's keyboard.
 */

import { useActionState } from "react";
import { Button, ErrorSummary, Stack, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { FactorFormState } from "./actions";

interface CodeEntryFormProps {
  locale: Locale;
  action: (prev: FactorFormState, formData: FormData) => Promise<FactorFormState>;
  id: string;
  label: string;
  hint: string;
  numeric: boolean;
}

export function CodeEntryForm({ locale, action, id, label, hint, numeric }: CodeEntryFormProps) {
  const [state, formAction, pending] = useActionState<FactorFormState, FormData>(action, {});
  return (
    <form action={formAction} noValidate>
      <Stack space={6}>
        {state.error ? (
          <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: `#${id}`, message: state.error }]} />
        ) : null}
        <TextInput
          id={id}
          name="code"
          label={label}
          hint={hint}
          error={state.error}
          inputMode={numeric ? "numeric" : "text"}
          autoComplete="one-time-code"
          spellCheck={false}
          autoCapitalize="none"
          className="max-w-[16rem]"
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
