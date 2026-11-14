"use client";

import { useActionState } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, ErrorSummary, Select, Stack, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { RedirectFormState } from "./actions";

interface RedirectFormProps {
  locale: Locale;
  action: (prev: RedirectFormState, formData: FormData) => Promise<RedirectFormState>;
  defaults?: { from: string; to: string; status: number };
  submitLabel: string;
}

const EMPTY: RedirectFormState = { errors: {} };

export function RedirectForm({ locale, action, defaults, submitLabel }: RedirectFormProps) {
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const items = [
    state.errors.from ? { href: "#rd-from", message: state.errors.from } : null,
    state.errors.to ? { href: "#rd-to", message: state.errors.to } : null,
    state.errors.status ? { href: "#rd-status", message: state.errors.status } : null,
  ].filter((i): i is { href: string; message: string } => i !== null);

  return (
    <form action={formAction} noValidate>
      <Stack space={4}>
        {items.length > 0 ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} /> : null}
        {state.formError ? <p className="m-0 font-medium">{state.formError}</p> : null}
        <TextInput id="rd-from" name="from" label={a("rdFrom", locale)} hint={a("rdFromHint", locale)} error={state.errors.from} defaultValue={defaults?.from ?? ""} spellCheck={false} autoCapitalize="none" autoComplete="off" className="max-w-[40rem]" />
        <TextInput id="rd-to" name="to" label={a("rdTo", locale)} hint={a("rdToHint", locale)} error={state.errors.to} defaultValue={defaults?.to ?? ""} spellCheck={false} autoCapitalize="none" autoComplete="off" className="max-w-[40rem]" />
        <Select
          id="rd-status"
          name="status"
          label={a("rdStatus", locale)}
          error={state.errors.status}
          defaultValue={String(defaults?.status ?? 301)}
          options={[
            { value: "301", label: a("rdStatus301", locale) },
            { value: "308", label: a("rdStatus308", locale) },
          ]}
          className="max-w-[24rem]"
        />
        <div>
          <Button type="submit" icon={<ConsoleIcon name="save" />} loading={pending} loadingLabel={a("formSaving", locale)}>
            {submitLabel}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
