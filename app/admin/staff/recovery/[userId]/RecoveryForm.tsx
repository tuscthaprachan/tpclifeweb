"use client";

import { useActionState } from "react";
import { LinkReady } from "@/components/admin/LinkReady";
import { Button, ErrorSummary, Stack } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { issueRecovery, type RecoveryFormState } from "../../actions";

export function RecoveryForm({ locale, userId }: { locale: Locale; userId: string }) {
  const [state, formAction, pending] = useActionState<RecoveryFormState, FormData>(issueRecovery, {});

  if (state.created) {
    return (
      <Stack space={4}>
        <LinkReady
          locale={locale}
          id="admin-recovery-link"
          title={a("recoveryReadyTitle", locale)}
          body={a("recoveryReadyBody", locale, { person: state.created.person, hours: state.created.hours })}
          link={state.created.link}
          email={state.created.email}
          emailed={state.created.emailed}
        />
        <p className="m-0">
          <a href="/admin/staff">{a("backToStaff", locale)}</a>
        </p>
      </Stack>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <Stack space={6}>
        {state.error ? (
          <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#admin-recovery-submit", message: state.error }]} />
        ) : null}
        <div className="flex flex-wrap items-center gap-[var(--space-4)]">
          <Button id="admin-recovery-submit" type="submit" loading={pending} loadingLabel={a("recoveryButton", locale)}>
            {a("recoveryButton", locale)}
          </Button>
          <a href="/admin/staff">{a("keepIt", locale)}</a>
        </div>
      </Stack>
    </form>
  );
}
