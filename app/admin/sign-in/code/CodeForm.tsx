"use client";

import { useActionState } from "react";
import { Button, ErrorSummary, Stack, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { verifyCode, type CodeFormState } from "../actions";

export function CodeForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState<CodeFormState, FormData>(verifyCode, {});

  return (
    <form action={formAction} noValidate>
      <Stack space={6}>
        {state.error ? (
          <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#admin-code", message: state.error }]} />
        ) : null}
        <TextInput
          id="admin-code"
          name="code"
          label={a("codeLabel", locale)}
          error={state.error}
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          maxLength={14}
          className="max-w-[12rem]"
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
