"use client";

import { useActionState } from "react";
import { Button, ErrorSummary, NotificationBanner, Select, Textarea, Stack } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { addNoteAction, addUpdateAction, assignAction, changeStatusAction, type CaseFormState } from "./actions";

interface Common {
  locale: Locale;
  caseId: string;
  organisationId: number;
}

function Hidden({ caseId, organisationId }: Pick<Common, "caseId" | "organisationId">) {
  return (
    <>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="org" value={organisationId} />
    </>
  );
}

function Feedback({ state, locale, anchor }: { state: CaseFormState; locale: Locale; anchor: string }) {
  return (
    <>
      {state.saved ? (
        <NotificationBanner variant="success" title={a(state.saved, locale)}>
          {null}
        </NotificationBanner>
      ) : null}
      {state.error ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={3} items={[{ href: `#${anchor}`, message: state.error }]} /> : null}
    </>
  );
}

/** Moves the case to another status. Only transitions the state machine allows are offered. */
export function StatusForm({ locale, caseId, organisationId, from, options }: Common & { from: string; options: Array<{ value: string; label: string }> }) {
  const [state, action, pending] = useActionState<CaseFormState, FormData>(changeStatusAction, {});
  if (options.length === 0) return <p className="m-0 text-ink-600">{a("caseStatusNone", locale)}</p>;
  return (
    <form action={action} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor="case-status" />
        <Hidden caseId={caseId} organisationId={organisationId} />
        <input type="hidden" name="from" value={from} />
        <Select
          id="case-status"
          name="status"
          label={a("caseStatusLabel", locale)}
          defaultValue={state.values?.status ?? ""}
          options={[{ value: "", label: a("caseStatusChoose", locale) }, ...options]}
          className="max-w-[24rem]"
        />
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("caseStatusSave", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

export function NoteForm({ locale, caseId, organisationId }: Common) {
  const [state, action, pending] = useActionState<CaseFormState, FormData>(addNoteAction, {});
  return (
    <form action={action} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor="case-note" />
        <Hidden caseId={caseId} organisationId={organisationId} />
        <Textarea
          id="case-note"
          name="note"
          label={a("caseNoteLabel", locale)}
          hint={a("caseNoteHint", locale)}
          defaultValue={state.values?.note ?? ""}
          key={state.saved ? "saved" : "typing"}
          rows={4}
          maxLength={4000}
        />
        <div>
          <Button type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("caseNoteSave", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

export function UpdateForm({ locale, caseId, organisationId }: Common) {
  const [state, action, pending] = useActionState<CaseFormState, FormData>(addUpdateAction, {});
  return (
    <form action={action} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor="case-update-th" />
        <Hidden caseId={caseId} organisationId={organisationId} />
        <p className="m-0 text-ink-600">{a("caseUpdateHint", locale)}</p>
        <Textarea id="case-update-th" name="th" lang="th" label={a("caseUpdateTh", locale)} defaultValue={state.values?.th ?? ""} key={`th-${state.saved ? "s" : "t"}`} rows={3} maxLength={4000} />
        <Textarea id="case-update-en" name="en" lang="en" label={a("caseUpdateEn", locale)} defaultValue={state.values?.en ?? ""} key={`en-${state.saved ? "s" : "t"}`} rows={3} maxLength={4000} />
        <div>
          <Button type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("caseUpdateSave", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

export function AssignForm({
  locale,
  caseId,
  organisationId,
  current,
  assignees,
}: Common & { current: string | null; assignees: Array<{ value: string; label: string }> }) {
  const [state, action, pending] = useActionState<CaseFormState, FormData>(assignAction, {});
  return (
    <form action={action} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor="case-assignee" />
        <Hidden caseId={caseId} organisationId={organisationId} />
        <Select
          id="case-assignee"
          name="assignee"
          label={a("caseAssignLabel", locale)}
          defaultValue={current ?? ""}
          options={[{ value: "", label: a("caseAssignNobody", locale) }, ...assignees]}
          className="max-w-[24rem]"
        />
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <Button type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("caseAssignSave", locale)}
          </Button>
          <Button type="submit" variant="quiet" name="assignee" value="me">
            {a("caseAssignMe", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}
