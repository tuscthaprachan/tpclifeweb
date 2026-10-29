"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button, ErrorMessage, ErrorSummary, Fieldset, InsetText, NotificationBanner, Radios, Stack, SummaryList, TextInput, Textarea } from "@/components/ui";
import type { LoanField } from "@/lib/borrowing/workflow";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import {
  approveAction,
  cancelAction,
  declineAction,
  handoverAction,
  notCollectedAction,
  returnAction,
  revealDetailsAction,
  settleAction,
  type BrState,
} from "./actions";

interface Base {
  locale: Locale;
  caseId: string;
  orgId: number;
}

/** A line of the loan as the forms need it. */
export interface FormLine {
  lineId: string;
  name: { th: string; en: string };
  unit: { th: string; en: string };
  quantity: number;
  free: number;
}

const EMPTY: BrState = {};
const box = "size-5";

function Ids({ caseId, orgId }: Pick<Base, "caseId" | "orgId">) {
  return (
    <>
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="org" value={orgId} />
    </>
  );
}

const REMIND_KEY = {
  no_contact: "brRemindNoContact",
  no_email: "brRemindNoEmail",
  email_not_configured: "brRemindNoEmailSetup",
  send_failed: "brRemindSendFailed",
} as const satisfies Record<string, AdminKey>;

/** The success banner, what happened when the borrower was told by email, and the error summary. */
function Feedback({ state, locale, form, targets = {} }: { state: BrState; locale: Locale; form: string; targets?: Partial<Record<LoanField, string>> }) {
  const items = [
    ...Object.entries(state.errors ?? {}).map(([field, message]) => ({ href: `#${targets[field as LoanField] ?? `${form}-${field}`}`, message })),
    ...(state.error ? [{ href: `#${form}`, message: state.error }] : []),
  ];
  return (
    <>
      {state.saved ? (
        <NotificationBanner variant="success" title={a(state.saved, locale)}>
          {null}
        </NotificationBanner>
      ) : null}
      {state.notice ? (
        state.notice.result === "sent" ? (
          <NotificationBanner variant="success" title={a("brNoticeSent", locale)}>
            {null}
          </NotificationBanner>
        ) : (
          <NotificationBanner variant="info" title={a("brNoticeRemindTitle", locale)}>
            {a(REMIND_KEY[state.notice.reason], locale)}
          </NotificationBanner>
        )
      ) : null}
      {items.length > 0 ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={3} items={items} /> : null}
    </>
  );
}

const err = (state: BrState, field: LoanField) => state.errors?.[field];

function Pending({ locale, pending, children, variant }: { locale: Locale; pending: boolean; children: ReactNode; variant?: "primary" | "secondary" | "destructive" }) {
  return (
    <div>
      <Button type="submit" variant={variant} loading={pending} loadingLabel={a("caseSaving", locale)}>
        {children}
      </Button>
    </div>
  );
}

/** Thai and English boxes for words the borrower will read. Either or both. */
function Bilingual({ id, state, locale, thLabel, enLabel, hint, error, rows = 3 }: { id: string; state: BrState; locale: Locale; thLabel: AdminKey; enLabel: AdminKey; hint?: AdminKey; error?: string; rows?: number }) {
  return (
    <>
      {hint ? <p className="m-0 text-ink-600">{a(hint, locale)}</p> : null}
      <Textarea id={`${id}-th`} name="th" lang="th" label={a(thLabel, locale)} defaultValue={state.values?.th ?? ""} key={`th-${state.saved ? "s" : "t"}`} rows={rows} maxLength={4000} error={error} />
      <Textarea id={`${id}-en`} name="en" lang="en" label={a(enLabel, locale)} defaultValue={state.values?.en ?? ""} key={`en-${state.saved ? "s" : "t"}`} rows={rows} maxLength={4000} />
    </>
  );
}

function Check({ id, name, label, defaultChecked, error }: { id: string; name: string; label: string; defaultChecked?: boolean; error?: string }) {
  return (
    <div>
      <label className="flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
        <input id={id} type="checkbox" name={name} value="yes" defaultChecked={defaultChecked} className={box} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
        {label}
      </label>
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
    </div>
  );
}

/** The student number and affiliation stay out of the page until staff ask; showing them is logged. */
export function DetailsReveal({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<BrState, FormData>(revealDetailsAction, EMPTY);
  const [hidden, setHidden] = useState(false);
  const details = state.details;
  const none = <span className="text-ink-600">{a("caseNone", locale)}</span>;
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <Feedback state={{ error: state.error }} locale={locale} form="br-details-show" />
      {state.details === null && !state.error ? <p className="m-0 text-ink-600">{a("brDetailsGone", locale)}</p> : null}
      {details && !hidden ? (
        <div className="flex flex-col gap-[var(--space-3)]" aria-live="polite">
          <SummaryList
            rows={[
              ...(details.studentId ? [{ key: a("brRowStudentNumber", locale), value: details.studentId }] : []),
              ...(details.faculty ? [{ key: a("brRowFaculty", locale), value: pick(details.faculty, locale) || none }] : []),
              ...(details.affiliation ? [{ key: a("brRowAffiliation", locale), value: details.affiliation }] : []),
            ]}
          />
          <div>
            <Button variant="secondary" onClick={() => setHidden(true)}>
              {a("brDetailsHide", locale)}
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
          <Button id="br-details-show" type="submit" variant="secondary" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {a("brDetailsShow", locale)}
          </Button>
        </form>
      )}
      <p className="m-0 text-sm text-ink-600">{a("brDetailsLogged", locale)}</p>
    </div>
  );
}

/** Approve: leave quantities as asked or lower any of them; the note is optional and bilingual. */
export function ApproveForm({ locale, caseId, orgId, lines }: Base & { lines: FormLine[] }) {
  const [state, run, pending] = useActionState<BrState, FormData>(approveAction, EMPTY);
  return (
    <form action={run} noValidate id="br-approve">
      <Stack space={4}>
        <Feedback state={state} locale={locale} form="br-approve" targets={{ quantities: `br-approve-q-${lines[0]?.lineId}` }} />
        <Ids caseId={caseId} orgId={orgId} />
        <Fieldset id="br-approve-quantities" legend={a("brApproveQuantities", locale)} hint={a("brApproveQuantitiesHint", locale)} error={err(state, "quantities")}>
          <ul className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
            {lines.map((line) => (
              <li key={line.lineId}>
                <TextInput
                  id={`br-approve-q-${line.lineId}`}
                  name={`q_${line.lineId}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={line.quantity}
                  label={`${pick(line.name, locale)} (${pick(line.unit, locale)})`}
                  hint={a("brAskedFree", locale, { asked: line.quantity, free: line.free })}
                  placeholder={String(line.quantity)}
                  defaultValue={state.values?.[`q_${line.lineId}`] ?? ""}
                  className="max-w-[10rem]"
                />
              </li>
            ))}
          </ul>
        </Fieldset>
        <Bilingual id="br-approve-note" state={state} locale={locale} thLabel="brApproveNoteTh" enLabel="brApproveNoteEn" hint="brApproveNoteHint" rows={2} />
        <Pending locale={locale} pending={pending}>
          {a("brApprove", locale)}
        </Pending>
      </Stack>
    </form>
  );
}

export function DeclineForm({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<BrState, FormData>(declineAction, EMPTY);
  return (
    <form action={run} noValidate id="br-decline">
      <Stack space={4}>
        <Feedback state={state} locale={locale} form="br-decline" targets={{ reason: "br-decline-reason-th" }} />
        <Ids caseId={caseId} orgId={orgId} />
        <Bilingual id="br-decline-reason" state={state} locale={locale} thLabel="brReasonTh" enLabel="brReasonEn" hint="brDeclineHint" error={err(state, "reason")} />
        <Pending locale={locale} pending={pending} variant="destructive">
          {a("brDecline", locale)}
        </Pending>
      </Stack>
    </form>
  );
}

/** Handover: the condition check, what was left as a deposit and how many. Never a card number. */
export function HandoverForm({ locale, caseId, orgId, cardsAsked }: Base & { cardsAsked: number }) {
  const [state, run, pending] = useActionState<BrState, FormData>(handoverAction, EMPTY);
  return (
    <form action={run} noValidate id="br-handover">
      <Stack space={4}>
        <Feedback state={state} locale={locale} form="br-handover" targets={{ checked: "br-handover-checked", deposit: "br-handover-deposit-0", note: "br-handover-note" }} />
        <Ids caseId={caseId} orgId={orgId} />
        <Check id="br-handover-checked" name="checked" label={a("brHandoverChecked", locale)} error={err(state, "checked")} />
        <Radios
          id="br-handover-deposit"
          name="depositKind"
          legend={a("brDepositKind", locale)}
          hint={a("brDepositNever", locale)}
          error={err(state, "deposit")}
          defaultValue={state.values?.depositKind || "student_card"}
          options={[
            { value: "student_card", label: a("brDepositStudentCard", locale) },
            { value: "national_id_card", label: a("brDepositIdCard", locale) },
            { value: "other", label: a("brDepositOther", locale) },
          ]}
        />
        <TextInput
          id="br-handover-count"
          name="depositCount"
          type="number"
          inputMode="numeric"
          min={0}
          max={5}
          label={a("brDepositCount", locale)}
          hint={a("brDepositCountHint", locale, { count: cardsAsked })}
          defaultValue={state.values?.depositCount ?? String(cardsAsked)}
          className="max-w-[10rem]"
        />
        <Textarea id="br-handover-note" name="note" label={a("brHandoverNote", locale)} hint={a("brNoteHint", locale)} defaultValue={state.values?.note ?? ""} key={state.saved ? "s" : "t"} rows={2} maxLength={1000} error={err(state, "note")} />
        <Pending locale={locale} pending={pending}>
          {a("brHandoverSave", locale)}
        </Pending>
      </Stack>
    </form>
  );
}

/**
 * Return: per item, how many came back good, damaged or lost. Plain number
 * inputs that start with everything good, so a clean return is one click and
 * the sums work without JavaScript.
 */
export function ReturnForm({ locale, caseId, orgId, lines, depositHeld }: Base & { lines: FormLine[]; depositHeld: boolean }) {
  const [state, run, pending] = useActionState<BrState, FormData>(returnAction, EMPTY);
  const v = (key: string, fallback: string) => state.values?.[key] ?? fallback;
  return (
    <form action={run} noValidate id="br-return">
      <Stack space={4}>
        <Feedback state={state} locale={locale} form="br-return" targets={{ counts: `br-return-g-${lines[0]?.lineId}`, compensation: "br-return-compensation", note: "br-return-note" }} />
        <Ids caseId={caseId} orgId={orgId} />
        <Fieldset id="br-return-counts" legend={a("brReturnCounts", locale)} hint={a("brReturnCountsHint", locale)} error={err(state, "counts")}>
          <ul className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
            {lines.map((line) => (
              <li key={line.lineId}>
                <Fieldset id={`br-return-${line.lineId}`} legend={`${pick(line.name, locale)}: ${a("brLent", locale, { count: line.quantity, unit: pick(line.unit, locale) })}`}>
                  <div className="flex flex-wrap gap-[var(--space-4)]">
                    <TextInput id={`br-return-g-${line.lineId}`} name={`g_${line.lineId}`} type="number" inputMode="numeric" min={0} max={line.quantity} label={a("brGood", locale)} defaultValue={v(`g_${line.lineId}`, String(line.quantity))} className="max-w-[8rem]" />
                    <TextInput id={`br-return-d-${line.lineId}`} name={`d_${line.lineId}`} type="number" inputMode="numeric" min={0} max={line.quantity} label={a("brDamaged", locale)} defaultValue={v(`d_${line.lineId}`, "0")} className="max-w-[8rem]" />
                    <TextInput id={`br-return-l-${line.lineId}`} name={`l_${line.lineId}`} type="number" inputMode="numeric" min={0} max={line.quantity} label={a("brLost", locale)} defaultValue={v(`l_${line.lineId}`, "0")} className="max-w-[8rem]" />
                  </div>
                </Fieldset>
              </li>
            ))}
          </ul>
        </Fieldset>
        <Check id="br-return-deposit" name="depositReturned" label={depositHeld ? a("brDepositGiveBack", locale) : a("brDepositGiveBackNone", locale)} defaultChecked={depositHeld} />
        <InsetText>
          <p className="m-0 font-medium">{a("brCompensationHeading", locale)}</p>
          <p className="mt-[var(--space-1)] mb-[var(--space-3)]">{a("brCompensationHint", locale)}</p>
          <Stack space={3}>
            <TextInput id="br-return-compensation" name="compensationBaht" type="number" inputMode="numeric" min={0} max={100000} label={a("brCompensationBaht", locale)} error={err(state, "compensation")} defaultValue={v("compensationBaht", "")} className="max-w-[12rem]" />
            <Textarea id="br-return-compensation-note" name="compensationNote" label={a("brCompensationNote", locale)} hint={a("brNoteHint", locale)} defaultValue={v("compensationNote", "")} rows={2} maxLength={1000} />
            <Check id="br-return-oos" name="takeOutOfService" label={a("brTakeOutOfService", locale)} />
          </Stack>
        </InsetText>
        <Textarea id="br-return-note" name="note" label={a("brReturnNote", locale)} hint={a("brNoteHint", locale)} defaultValue={v("note", "")} rows={2} maxLength={1000} error={err(state, "note")} />
        <Pending locale={locale} pending={pending}>
          {a("brReturnSave", locale)}
        </Pending>
      </Stack>
    </form>
  );
}

export function SettleForm({ locale, caseId, orgId, depositHeld }: Base & { depositHeld: boolean }) {
  const [state, run, pending] = useActionState<BrState, FormData>(settleAction, EMPTY);
  return (
    <form action={run} noValidate id="br-settle">
      <Stack space={4}>
        <Feedback state={state} locale={locale} form="br-settle" targets={{ settlement: "br-settle-settlement-0", note: "br-settle-note" }} />
        <Ids caseId={caseId} orgId={orgId} />
        <Radios
          id="br-settle-settlement"
          name="settlement"
          legend={a("brSettlement", locale)}
          error={err(state, "settlement")}
          defaultValue={state.values?.settlement ?? ""}
          options={[
            { value: "paid", label: a("brSettlePaid", locale) },
            { value: "replaced", label: a("brSettleReplaced", locale) },
            { value: "waived", label: a("brSettleWaived", locale) },
          ]}
        />
        {depositHeld ? <Check id="br-settle-deposit" name="depositReturned" label={a("brDepositGiveBack", locale)} defaultChecked /> : null}
        <Textarea id="br-settle-note" name="note" label={a("brSettleNote", locale)} hint={a("brNoteHint", locale)} defaultValue={state.values?.note ?? ""} key={state.saved ? "s" : "t"} rows={2} maxLength={1000} error={err(state, "note")} />
        <Pending locale={locale} pending={pending}>
          {a("brSettleSave", locale)}
        </Pending>
      </Stack>
    </form>
  );
}

export function NotCollectedButton({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<BrState, FormData>(notCollectedAction, EMPTY);
  return (
    <form action={run} noValidate id="br-not-collected">
      <Stack space={3}>
        <Feedback state={state} locale={locale} form="br-not-collected" />
        <Ids caseId={caseId} orgId={orgId} />
        <Pending locale={locale} pending={pending} variant="secondary">
          {a("brNotCollected", locale)}
        </Pending>
      </Stack>
    </form>
  );
}

export function CancelForm({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<BrState, FormData>(cancelAction, EMPTY);
  return (
    <form action={run} noValidate id="br-cancel">
      <Stack space={4}>
        <Feedback state={state} locale={locale} form="br-cancel" targets={{ reason: "br-cancel-reason-th" }} />
        <Ids caseId={caseId} orgId={orgId} />
        <Bilingual id="br-cancel-reason" state={state} locale={locale} thLabel="brReasonTh" enLabel="brReasonEn" hint="brCancelHint" error={err(state, "reason")} />
        <Pending locale={locale} pending={pending} variant="destructive">
          {a("brCancel", locale)}
        </Pending>
      </Stack>
    </form>
  );
}
