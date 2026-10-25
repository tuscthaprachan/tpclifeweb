"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button, ErrorSummary, InsetText, NotificationBanner, Select, Stack, SummaryList, Textarea } from "@/components/ui";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import {
  acknowledgeAction,
  closeAction,
  recategoriseAction,
  reopenAction,
  resolveAction,
  revealEvidenceAction,
  revealTextAction,
  startAction,
  withdrawAction,
  wellbeingAction,
  type CpState,
} from "./actions";

interface Base {
  locale: Locale;
  caseId: string;
  orgId: number;
}

const EMPTY: CpState = {};

function Ids({ caseId, orgId }: Pick<Base, "caseId" | "orgId">) {
  return (
    <>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="org" value={orgId} />
    </>
  );
}

/** The success banner, what happened when the person was told by email, and the error summary. */
function Feedback({ state, locale, anchor }: { state: CpState; locale: Locale; anchor: string }) {
  return (
    <>
      {state.saved ? (
        <NotificationBanner variant="success" title={a(state.saved, locale)}>
          {null}
        </NotificationBanner>
      ) : null}
      {state.notice ? <Notice notice={state.notice} locale={locale} /> : null}
      {state.error ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={3} items={[{ href: `#${anchor}`, message: state.error }]} /> : null}
    </>
  );
}

const REMIND_KEY = {
  no_contact: "cpcRemindNoContact",
  no_consent: "cpcRemindNoConsent",
  no_email: "cpcRemindNoEmail",
  email_not_configured: "cpcRemindNoEmailSetup",
  send_failed: "cpcRemindSendFailed",
} as const satisfies Record<string, AdminKey>;

function Notice({ notice, locale }: { notice: NonNullable<CpState["notice"]>; locale: Locale }) {
  if (notice.result === "sent") {
    return (
      <NotificationBanner variant="success" title={a("cpcNoticeSent", locale)}>
        {null}
      </NotificationBanner>
    );
  }
  return (
    <NotificationBanner variant="info" title={a("cpcNoticeRemindTitle", locale)}>
      {a(REMIND_KEY[notice.reason], locale)}
    </NotificationBanner>
  );
}

/** A single button that does one thing to the complaint. */
function Act({ locale, caseId, orgId, action, label, variant = "secondary", extra }: Base & { action: (prev: CpState, fd: FormData) => Promise<CpState>; label: AdminKey; variant?: "primary" | "secondary" | "destructive"; extra?: Record<string, string> }) {
  const [state, run, pending] = useActionState<CpState, FormData>(action, EMPTY);
  return (
    <form action={run} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor={`cp-act-${label}`} />
        <Ids caseId={caseId} orgId={orgId} />
        {Object.entries(extra ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div>
          <Button id={`cp-act-${label}`} type="submit" variant={variant} loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a(label, locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

export function StartButton(props: Base) {
  return <Act {...props} action={startAction} label="cpcStart" />;
}
export function CloseButton(props: Base) {
  return <Act {...props} action={closeAction} label="cpcClose" />;
}
export function ReopenButton(props: Base) {
  return <Act {...props} action={reopenAction} label="cpcReopen" />;
}
export function WellbeingButton(props: Base) {
  return <Act {...props} action={wellbeingAction} label="cpcWellbeingRoute" />;
}
export function WithdrawButton(props: Base & { from: string }) {
  return <Act {...props} action={withdrawAction} label="cpcWithdraw" variant="destructive" extra={{ from: props.from }} />;
}

/** Acknowledge: the standard message goes out as it is; staff may add a few words in either language. */
export function AcknowledgeForm({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<CpState, FormData>(acknowledgeAction, EMPTY);
  return (
    <form action={run} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor="cp-ack-th" />
        <Ids caseId={caseId} orgId={orgId} />
        <p className="m-0 text-ink-600">{a("cpcAckHint", locale)}</p>
        <Textarea id="cp-ack-th" name="th" lang="th" label={a("cpcAckExtraTh", locale)} defaultValue={state.values?.th ?? ""} key={`th-${state.saved ? "s" : "t"}`} rows={2} maxLength={2000} />
        <Textarea id="cp-ack-en" name="en" lang="en" label={a("cpcAckExtraEn", locale)} defaultValue={state.values?.en ?? ""} key={`en-${state.saved ? "s" : "t"}`} rows={2} maxLength={2000} />
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("cpcAcknowledge", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

/** The resolution form: the outcome the person reads, in either language or both. */
export function ResolveForm({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<CpState, FormData>(resolveAction, EMPTY);
  return (
    <form action={run} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor="cp-resolve-th" />
        <Ids caseId={caseId} orgId={orgId} />
        <p className="m-0 text-ink-600">{a("cpcResolveHint", locale)}</p>
        <Textarea id="cp-resolve-th" name="th" lang="th" label={a("cpcOutcomeTh", locale)} defaultValue={state.values?.th ?? ""} key={`th-${state.saved ? "s" : "t"}`} rows={4} maxLength={4000} />
        <Textarea id="cp-resolve-en" name="en" lang="en" label={a("cpcOutcomeEn", locale)} defaultValue={state.values?.en ?? ""} key={`en-${state.saved ? "s" : "t"}`} rows={4} maxLength={4000} />
        <div>
          <Button type="submit" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("cpcResolve", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

/** Recategorise. Leaving a restricted category needs an explicit yes; entering one hands the complaint on to the named staff. */
export function RecategoriseForm({
  locale,
  caseId,
  orgId,
  current,
  categories,
}: Base & { current: { id: string; restricted: boolean }; categories: Array<{ value: string; label: string; restricted: boolean }> }) {
  const [state, run, pending] = useActionState<CpState, FormData>(recategoriseAction, EMPTY);
  const [choice, setChoice] = useState(current.id);
  const router = useRouter();
  useEffect(() => {
    if (state.leftSight) router.push("/admin/cases");
  }, [state.leftSight, router]);
  const target = categories.find((c) => c.value === choice);
  const leaving = current.restricted && target && !target.restricted;
  const entering = !current.restricted && target?.restricted;
  return (
    <form action={run} noValidate>
      <Stack space={3}>
        <Feedback state={state} locale={locale} anchor="cp-category" />
        <Ids caseId={caseId} orgId={orgId} />
        <Select
          id="cp-category"
          name="category"
          label={a("cpcCategoryLabel", locale)}
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          options={categories.map((c) => ({ value: c.value, label: c.label }))}
          className="max-w-[28rem]"
        />
        {entering ? (
          <InsetText>
            <p className="m-0">{a("cpcRecatEntering", locale)}</p>
          </InsetText>
        ) : null}
        {leaving ? (
          <InsetText>
            <p className="m-0">{a("cpcRecatLeaving", locale)}</p>
            <label className="mt-[var(--space-2)] flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <input type="checkbox" name="confirm" value="yes" className="size-5" />
              {a("cpcRecatConfirm", locale)}
            </label>
          </InsetText>
        ) : null}
        <div>
          <Button type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)} disabled={choice === current.id}>
            {a("cpcRecategorise", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

/** What the person wrote stays out of the page until staff ask; showing it is logged. */
export function TextReveal({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<CpState, FormData>(revealTextAction, EMPTY);
  const [hidden, setHidden] = useState(false);
  const shown = state.text && !hidden;
  const text = state.text;
  const none = <span className="text-ink-600">{a("caseNone", locale)}</span>;
  const lines = (v: string | null | undefined) => (v ? <span className="whitespace-pre-line">{v}</span> : none);
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <Feedback state={state} locale={locale} anchor="cp-text-show" />
      {state.text === null && !state.error ? <p className="m-0 text-ink-600">{a("cpcTextGone", locale)}</p> : null}
      {shown && text ? (
        <div className="flex flex-col gap-[var(--space-3)]" aria-live="polite">
          <SummaryList
            rows={[
              { key: a("cpcRowDescription", locale), value: lines(text.description) },
              { key: a("cpcRowWhen", locale), value: lines(text.when) },
              { key: a("cpcRowWhere", locale), value: lines(text.where) },
              { key: a("cpcRowRemedy", locale), value: lines(text.remedy) },
              ...(text.reopenReason ? [{ key: a("cpcRowReopenReason", locale), value: lines(text.reopenReason) }] : []),
            ]}
          />
          <div>
            <Button variant="secondary" onClick={() => setHidden(true)}>
              {a("caseContactsHide", locale)}
            </Button>
          </div>
        </div>
      ) : (
        <form
          action={(fd) => {
            setHidden(false);
            run(fd);
          }}
        >
          <Ids caseId={caseId} orgId={orgId} />
          <Button id="cp-text-show" type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("cpcTextShow", locale)}
          </Button>
        </form>
      )}
      <p className="m-0 text-sm text-ink-600">{a("cpcTextLogged", locale)}</p>
    </div>
  );
}

/** Evidence files open through short-lived links, and only after a logged "Show". */
export function EvidenceReveal({ locale, caseId, orgId, count }: Base & { count: number }) {
  const [state, run, pending] = useActionState<CpState, FormData>(revealEvidenceAction, EMPTY);
  const [hidden, setHidden] = useState(false);
  const shown = state.evidence && !hidden;
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <p className="m-0 text-ink-600">{count === 1 ? a("cpcEvidenceHeldOne", locale) : a("cpcEvidenceHeld", locale, { count })}</p>
      <Feedback state={{ error: state.error }} locale={locale} anchor="cp-evidence-show" />
      {shown ? (
        <div className="flex flex-col gap-[var(--space-3)]" aria-live="polite">
          <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
            {state.evidence!.map((file) => (
              <li key={file.id}>
                {file.url ? (
                  <a href={file.url} target="_blank" rel="noreferrer" className="break-all">
                    {file.name ?? a("cpcFileUnnamed", locale)}
                    <span className="visually-hidden"> {a("cpcFileOpen", locale)}</span>
                  </a>
                ) : (
                  <span className="break-all">
                    {file.name ?? a("cpcFileUnnamed", locale)} <span className="text-ink-600">({a("cpcFileUnavailable", locale)})</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div>
            <Button variant="secondary" onClick={() => setHidden(true)}>
              {a("caseContactsHide", locale)}
            </Button>
          </div>
        </div>
      ) : (
        <form
          action={(fd) => {
            setHidden(false);
            run(fd);
          }}
        >
          <Ids caseId={caseId} orgId={orgId} />
          <Button id="cp-evidence-show" type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("cpcEvidenceShow", locale)}
          </Button>
        </form>
      )}
      <p className="m-0 text-sm text-ink-600">{a("cpcEvidenceLogged", locale)}</p>
    </div>
  );
}
