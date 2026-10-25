"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { Button, ErrorSummary, InsetText, NotificationBanner, Select, TextInput, Textarea } from "@/components/ui";
import { compressInBrowser } from "@/components/admin/content/compress-image-browser";
import { formatMegabytes } from "@/components/admin/content/compress-image";
import { ID_CHECK_TYPES } from "@/lib/lost-found/constants";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import {
  addClaimAction,
  addFinderAction,
  decideClaimAction,
  handoverAction,
  markMatchAction,
  publishFoundAction,
  publishListingAction,
  revealClaimAction,
  revealIdentifyingAction,
  revealVerificationAction,
  saveStorageAction,
  saveVerificationAction,
  startFoundAction,
  describeFoundAction,
  logLostAction,
  updateListingAction,
  uploadPhotoAction,
  type LfState,
} from "./actions";

export interface Option {
  value: string;
  label: string;
}

interface Base {
  locale: Locale;
  caseId: string;
  orgId: number;
}

const L = a;
const EMPTY: LfState = {};
const checkbox = "size-5";

function HiddenIds({ caseId, orgId }: { caseId?: string; orgId: number }) {
  return (
    <>
      {caseId ? <input type="hidden" name="caseId" value={caseId} /> : null}
      <input type="hidden" name="org" value={orgId} />
    </>
  );
}

/** Error summary, success banner and the "told the person" notice for a form. */
function Feedback({ state, locale, prefix }: { state: LfState; locale: Locale; prefix: string }) {
  const items = [
    ...Object.entries(state.errors ?? {}).map(([name, message]) => ({ href: `#${prefix}-${name.replace(/[^a-zA-Z0-9]+/g, "-")}`, message })),
    ...(state.error ? [{ href: `#${prefix}-form`, message: state.error }] : []),
  ];
  return (
    <>
      {state.saved ? (
        <NotificationBanner variant="success" title={a(state.saved, locale)}>
          {null}
        </NotificationBanner>
      ) : null}
      {state.notice ? <NoticeBanner notice={state.notice} locale={locale} /> : null}
      {items.length > 0 ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={3} items={items} /> : null}
      <span id={`${prefix}-form`} tabIndex={-1} />
    </>
  );
}

/** What happened when the person was told, or the reminder to do it by hand. */
export function NoticeBanner({ notice, locale }: { notice: NonNullable<LfState["notice"]>; locale: Locale }) {
  if (notice.result === "sent") {
    return (
      <NotificationBanner variant="success" title={a("lfcNoticeSentTitle", locale)}>
        {a("lfcNoticeSent", locale)}
      </NotificationBanner>
    );
  }
  const preferred = notice.preferred ? a(`contactPref_${notice.preferred}` as AdminKey, locale) : a("lfcNoticePreferredNone", locale);
  return (
    <NotificationBanner variant="warning" title={a("lfcRemindTitle", locale)}>
      <p className="m-0">{a(`lfcRemind_${notice.reason ?? "no_contact"}` as AdminKey, locale)}</p>
      <p className="m-0 mt-[var(--space-2)]">{a("lfcRemindPreferred", locale, { method: preferred })}</p>
      <p className="m-0 mt-[var(--space-2)]">{a("lfcRemindHow", locale)}</p>
    </NotificationBanner>
  );
}

function SaveButton({ locale, pending, label, variant = "secondary" }: { locale: Locale; pending: boolean; label: string; variant?: "primary" | "secondary" }) {
  return (
    <div>
      <Button type="submit" variant={variant} loading={pending} loadingLabel={a("caseSaving", locale)}>
        {label}
      </Button>
    </div>
  );
}

const control = (prefix: string, name: string) => `${prefix}-${name.replace(/[^a-zA-Z0-9]+/g, "-")}`;

/* Description fields, shared by the found item task, the panel and the walk-in lost report */

export interface DescribeDefaults {
  category?: string;
  titleTh?: string;
  titleEn?: string;
  descriptionTh?: string;
  descriptionEn?: string;
  placeId?: string | null;
  locationNoteTh?: string;
  locationNoteEn?: string;
  occurredOn?: string;
}

function DescribeFields({ locale, prefix, errors, defaults, categories, places }: { locale: Locale; prefix: string; errors: Record<string, string>; defaults: DescribeDefaults; categories: Option[]; places: Option[] }) {
  const field = (name: string) => ({ id: control(prefix, name), name, error: errors[name] });
  return (
    <>
      <Select {...field("category")} label={L("fieldCategory", locale)} options={[{ value: "", label: L("choiceSelect", locale) }, ...categories]} defaultValue={defaults.category ?? ""} className="max-w-[24rem]" />
      <InsetText>{L("lfcDescribeEitherLanguage", locale)}</InsetText>
      <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
        <TextInput {...field("title.th")} lang="th" label={`${L("fieldTitle", locale)} (${L("langThai", locale)})`} defaultValue={defaults.titleTh ?? ""} maxLength={200} />
        <TextInput {...field("title.en")} lang="en" label={`${L("fieldTitle", locale)} (${L("langEnglish", locale)})`} defaultValue={defaults.titleEn ?? ""} maxLength={200} />
      </div>
      <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
        <Textarea {...field("description.th")} lang="th" label={`${L("lfFieldDescription", locale)} (${L("langThai", locale)})`} hint={L("lfcDescribeHint", locale)} defaultValue={defaults.descriptionTh ?? ""} rows={4} maxLength={2000} />
        <Textarea {...field("description.en")} lang="en" label={`${L("lfFieldDescription", locale)} (${L("langEnglish", locale)})`} hint={L("lfcDescribeHint", locale)} defaultValue={defaults.descriptionEn ?? ""} rows={4} maxLength={2000} />
      </div>
      <Select {...field("placeId")} label={L("lfFieldPlace", locale)} options={[{ value: "", label: L("lfPlaceNone", locale) }, ...places]} defaultValue={defaults.placeId ?? ""} className="max-w-[32rem]" />
      <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
        <TextInput {...field("locationNote.th")} lang="th" label={`${L("lfFieldLocationNote", locale)} (${L("langThai", locale)})`} hint={L("lfFieldLocationNoteHint", locale)} defaultValue={defaults.locationNoteTh ?? ""} maxLength={300} />
        <TextInput {...field("locationNote.en")} lang="en" label={`${L("lfFieldLocationNote", locale)} (${L("langEnglish", locale)})`} hint={L("lfFieldLocationNoteHint", locale)} defaultValue={defaults.locationNoteEn ?? ""} maxLength={300} />
      </div>
      <TextInput {...field("occurredOn")} type="date" label={L("lfFieldOccurredOn", locale)} defaultValue={defaults.occurredOn ?? ""} className="max-w-[16rem]" />
    </>
  );
}

type DescribeMode = "start" | "describe" | "panel";

/** Describe the item: the first task of the found item intake, and the quick edit on the case page. */
export function DescribeForm({ locale, mode, caseId, orgId, defaults, categories, places }: { locale: Locale; mode: DescribeMode; caseId?: string; orgId: number; defaults: DescribeDefaults; categories: Option[]; places: Option[] }) {
  const action = mode === "start" ? startFoundAction : mode === "describe" ? describeFoundAction : updateListingAction;
  const [state, run, pending] = useActionState<LfState, FormData>(action, EMPTY);
  const prefix = useId().replace(/:/g, "");
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-4)]">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      <DescribeFields locale={locale} prefix={prefix} errors={state.errors ?? {}} defaults={defaults} categories={categories} places={places} />
      <SaveButton locale={locale} pending={pending} variant={mode === "panel" ? "secondary" : "primary"} label={L(mode === "start" ? "lfcStartSave" : "lfcDescribeSave", locale)} />
    </form>
  );
}

/** A lost report taken at the desk on someone's behalf. */
export function WalkInLostForm({ locale, orgId, categories, places }: { locale: Locale; orgId: number; categories: Option[]; places: Option[] }) {
  const [state, run, pending] = useActionState<LfState, FormData>(logLostAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  const errors = state.errors ?? {};
  const field = (name: string) => ({ id: control(prefix, name), name, error: errors[name] });
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-6)]">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds orgId={orgId} />
      <section aria-labelledby={`${prefix}-item`} className="flex flex-col gap-[var(--space-4)]">
        <h2 id={`${prefix}-item`} className="m-0 text-xl font-semibold">
          {L("lfcWalkInItem", locale)}
        </h2>
        <DescribeFields locale={locale} prefix={prefix} errors={errors} defaults={{}} categories={categories} places={places} />
      </section>
      <section aria-labelledby={`${prefix}-person`} className="flex flex-col gap-[var(--space-4)]">
        <h2 id={`${prefix}-person`} className="m-0 text-xl font-semibold">
          {L("lfcWalkInPerson", locale)}
        </h2>
        <InsetText>{L("lfcWalkInPersonHint", locale)}</InsetText>
        <TextInput {...field("contact.name")} label={L("lfcFieldName", locale)} autoComplete="off" maxLength={200} className="max-w-[24rem]" />
        <TextInput {...field("contact.email")} type="email" label={L("contactEmail", locale)} autoComplete="off" maxLength={320} className="max-w-[24rem]" />
        <TextInput {...field("contact.phone")} type="tel" label={L("contactPhone", locale)} autoComplete="off" maxLength={40} className="max-w-[16rem]" />
        <TextInput {...field("contact.lineId")} label={L("contactLine", locale)} autoComplete="off" maxLength={100} className="max-w-[16rem]" />
        <Select
          {...field("contact.preferred")}
          label={L("contactPreferred", locale)}
          options={[
            { value: "", label: L("choiceNone", locale) },
            { value: "email", label: L("contactPref_email", locale) },
            { value: "phone", label: L("contactPref_phone", locale) },
            { value: "line", label: L("contactPref_line", locale) },
          ]}
          className="max-w-[16rem]"
        />
        <Select
          {...field("language")}
          label={L("lfcFieldLanguage", locale)}
          options={[
            { value: "th", label: L("langThai", locale) },
            { value: "en", label: L("langEnglish", locale) },
          ]}
          defaultValue={locale}
          className="max-w-[16rem]"
        />
        <label className="flex items-start gap-[var(--space-2)]">
          <input type="checkbox" name="contact.consentContact" className={checkbox} />
          <span>{L("lfcConsentContact", locale)}</span>
        </label>
        <label className="flex items-start gap-[var(--space-2)]">
          <input type="checkbox" name="contact.consentShare" className={checkbox} />
          <span>{L("lfcConsentShare", locale)}</span>
        </label>
      </section>
      <SaveButton locale={locale} pending={pending} variant="primary" label={L("lfcWalkInSave", locale)} />
    </form>
  );
}

/* Listing publish */

export function PublishListingForm({ locale, caseId, orgId, found, disabledReason, openCaseAfter }: Base & { found: boolean; disabledReason?: string; openCaseAfter?: boolean }) {
  const [state, run, pending] = useActionState<LfState, FormData>(found ? publishFoundAction : publishListingAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-3)]">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      {openCaseAfter ? <input type="hidden" name="next" value="case" /> : null}
      {disabledReason ? <p className="m-0 text-ink-600">{disabledReason}</p> : null}
      <SaveButton locale={locale} pending={pending} variant="primary" label={L(found ? "lfcPublishFound" : "lfcPublishLost", locale)} />
    </form>
  );
}

/* Matching */

export function MatchButton({ locale, caseId, orgId, lostCaseId, foundCaseId, score, linked, reference }: Base & { lostCaseId: string; foundCaseId: string; score: number; linked: boolean; reference: string }) {
  const [state, run, pending] = useActionState<LfState, FormData>(markMatchAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-2)]">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      <input type="hidden" name="lostCaseId" value={lostCaseId} />
      <input type="hidden" name="foundCaseId" value={foundCaseId} />
      <input type="hidden" name="score" value={score} />
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={linked || state.saved !== undefined} loading={pending} loadingLabel={a("caseSaving", locale)}>
          {linked ? L("lfcMatchLinked", locale) : L("lfcMatchMark", locale)}
          <span className="visually-hidden"> {reference}</span>
        </Button>
      </div>
    </form>
  );
}

/* Show and hide a decrypted value (hidden detail, claim answer) */

function Reveal({ locale, action, fields, showLabel, shownTitle, loggedNote, emptyNote }: { locale: Locale; action: typeof revealVerificationAction; fields: Record<string, string | number>; showLabel: string; shownTitle: string; loggedNote: string; emptyNote: string }) {
  const [state, run, pending] = useActionState<LfState, FormData>(action, EMPTY);
  const [hidden, setHidden] = useState(false);
  const shown = state.secret !== undefined && !hidden;
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      {state.error ? <p role="alert" className="m-0 font-medium text-error">{state.error}</p> : null}
      {shown ? (
        <div aria-live="polite" className="flex flex-col gap-[var(--space-2)]">
          <p className="m-0 text-sm font-medium text-ink-600">{shownTitle}</p>
          <p className="m-0 whitespace-pre-wrap rounded-control border border-line-strong bg-surface-alt p-[var(--space-3)]">{state.secret ? state.secret : emptyNote}</p>
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setHidden(true)}>
              {a("lfcRevealHide", locale)}
              <span className="visually-hidden"> {shownTitle}</span>
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
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" variant="secondary" size="sm" loading={pending} loadingLabel={a("caseSaving", locale)}>
            {showLabel}
          </Button>
        </form>
      )}
      <p className="m-0 text-sm text-ink-600">{loggedNote}</p>
    </div>
  );
}

export function VerificationReveal({ locale, caseId, orgId }: Base) {
  return (
    <Reveal
      locale={locale}
      action={revealVerificationAction}
      fields={{ caseId, org: orgId }}
      showLabel={L("lfcVerificationShow", locale)}
      shownTitle={L("lfcVerificationTitle", locale)}
      loggedNote={L("lfcVerificationLogged", locale)}
      emptyNote={L("lfcVerificationEmpty", locale)}
    />
  );
}

export function IdentifyingReveal({ locale, caseId, orgId }: Base) {
  return (
    <Reveal
      locale={locale}
      action={revealIdentifyingAction}
      fields={{ caseId, org: orgId }}
      showLabel={L("lfcIdentifyingShow", locale)}
      shownTitle={L("lfcIdentifyingTitle", locale)}
      loggedNote={L("lfcVerificationLogged", locale)}
      emptyNote={L("lfcIdentifyingEmpty", locale)}
    />
  );
}

export function ClaimAnswerReveal({ locale, caseId, orgId, claimId }: Base & { claimId: string }) {
  return (
    <Reveal
      locale={locale}
      action={revealClaimAction}
      fields={{ caseId, org: orgId, claimId }}
      showLabel={L("lfcClaimShow", locale)}
      shownTitle={L("lfcClaimAnswerTitle", locale)}
      loggedNote={L("lfcClaimLogged", locale)}
      emptyNote={L("lfcClaimEmpty", locale)}
    />
  );
}

/* Found item details */

export function StorageForm({ locale, caseId, orgId, desks, deskId, shelf }: Base & { desks: Option[]; deskId: number | null; shelf: string }) {
  const [state, run, pending] = useActionState<LfState, FormData>(saveStorageAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  const errors = state.errors ?? {};
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-4)]">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      <Select id={control(prefix, "organisationId")} name="organisationId" error={errors.organisationId} label={L("lfcFieldDesk", locale)} options={desks} defaultValue={deskId ? String(deskId) : String(orgId)} className="max-w-[24rem]" />
      <TextInput id={control(prefix, "shelf")} name="shelf" error={errors.shelf} label={L("lfcFieldShelf", locale)} hint={L("lfcFieldShelfHint", locale)} defaultValue={shelf} maxLength={120} className="max-w-[24rem]" />
      <SaveButton locale={locale} pending={pending} label={L("lfcStorageSave", locale)} />
    </form>
  );
}

export function VerificationForm({ locale, caseId, orgId, has }: Base & { has: boolean }) {
  const [state, run, pending] = useActionState<LfState, FormData>(saveVerificationAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-4)]" autoComplete="off">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      <Textarea
        id={control(prefix, "detail")}
        name="detail"
        error={state.errors?.detail}
        label={L(has ? "lfcVerificationReplace" : "lfcFieldVerification", locale)}
        hint={L("lfcFieldVerificationHint", locale)}
        rows={4}
        maxLength={2000}
        key={state.saved ? "saved" : "typing"}
      />
      <SaveButton locale={locale} pending={pending} label={L("lfcVerificationSave", locale)} />
    </form>
  );
}

export function FinderForm({ locale, caseId, orgId, has }: Base & { has: boolean }) {
  const [state, run, pending] = useActionState<LfState, FormData>(addFinderAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  const errors = state.errors ?? {};
  const f = (name: string) => ({ id: control(prefix, `finder.${name}`), name: `finder.${name}`, error: errors[`finder.${name}`] });
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-4)]" autoComplete="off">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      {has ? <InsetText>{L("lfcFinderHeld", locale)}</InsetText> : null}
      <InsetText>{L("lfcFinderHint", locale)}</InsetText>
      <TextInput {...f("name")} label={L("lfcFieldName", locale)} maxLength={200} className="max-w-[24rem]" />
      <TextInput {...f("email")} type="email" label={L("contactEmail", locale)} maxLength={320} className="max-w-[24rem]" />
      <TextInput {...f("phone")} type="tel" label={L("contactPhone", locale)} maxLength={40} className="max-w-[16rem]" />
      <TextInput {...f("lineId")} label={L("contactLine", locale)} maxLength={100} className="max-w-[16rem]" />
      <label className="flex items-start gap-[var(--space-2)]">
        <input type="checkbox" name="finder.consentContact" className={checkbox} />
        <span>{L("lfcFinderConsent", locale)}</span>
      </label>
      <SaveButton locale={locale} pending={pending} label={L("lfcFinderSave", locale)} />
    </form>
  );
}

/** Photo upload. The picture is compressed in the browser first, as in the content image picker. */
export function PhotoUpload({ locale, caseId, orgId, storageConfigured, canPublic }: Base & { storageConfigured: boolean; canPublic: boolean }) {
  const [state, setState] = useState<LfState>({});
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = useId().replace(/:/g, "");
  if (!storageConfigured) {
    return (
      <NotificationBanner variant="info" title={a("storageNotConfiguredTitle", locale)}>
        {a("errPhotoStorageNotConfigured", locale)}
      </NotificationBanner>
    );
  }
  return (
    <form
      className="flex flex-col gap-[var(--space-3)]"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const file = form.querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
        const publicToo = form.querySelector<HTMLInputElement>('input[name="publicToo"]')?.checked;
        setState({});
        setNote(null);
        start(async () => {
          if (!file) return setState({ error: a("errUploadChoose", locale) });
          const compressed = await compressInBrowser(file);
          if (compressed.status === "failed") return setState({ error: a(compressed.reason === "decode" ? "errUploadCompressDecode" : "errUploadCompressStill", locale) });
          if (compressed.status === "compressed") setNote(a("imageCompressed", locale, { from: formatMegabytes(compressed.originalBytes), to: formatMegabytes(compressed.compressedBytes) }));
          const data = new FormData();
          data.set("caseId", caseId);
          data.set("org", String(orgId));
          data.set("file", compressed.file);
          if (publicToo) data.set("publicToo", "on");
          setState(await uploadPhotoAction(data));
          form.reset();
        });
      }}
    >
      <Feedback state={state} locale={locale} prefix={id} />
      <div className="flex flex-col gap-[var(--space-1)]">
        <label htmlFor={`${id}-file`} className="font-medium">
          {L("lfcPhotoFile", locale)}
        </label>
        <span className="text-sm text-ink-600">{L("lfcPhotoHint", locale)}</span>
        <input id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/heic" />
      </div>
      {canPublic ? (
        <label className="flex items-start gap-[var(--space-2)]">
          <input type="checkbox" name="publicToo" className={checkbox} />
          <span>{L("lfcPhotoPublic", locale)}</span>
        </label>
      ) : null}
      {note ? (
        <p role="status" className="m-0 text-sm text-ink-600">
          {note}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" loading={pending} loadingLabel={a("imageUploading", locale)}>
          {L("lfcPhotoUpload", locale)}
        </Button>
      </div>
    </form>
  );
}

/* Claims */

export function AddClaimForm({ locale, caseId, orgId }: Base) {
  const [state, run, pending] = useActionState<LfState, FormData>(addClaimAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  const errors = state.errors ?? {};
  const f = (name: string) => ({ id: control(prefix, name), name, error: errors[name] });
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-4)]" autoComplete="off">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      <Textarea {...f("answer")} label={L("lfcFieldClaimAnswer", locale)} hint={L("lfcFieldClaimAnswerHint", locale)} rows={4} maxLength={2000} key={state.saved ? "saved" : "typing"} />
      <TextInput {...f("claimant.name")} label={L("lfcFieldName", locale)} maxLength={200} className="max-w-[24rem]" />
      <TextInput {...f("claimant.email")} type="email" label={L("contactEmail", locale)} maxLength={320} className="max-w-[24rem]" />
      <TextInput {...f("claimant.phone")} type="tel" label={L("contactPhone", locale)} maxLength={40} className="max-w-[16rem]" />
      <TextInput {...f("claimant.lineId")} label={L("contactLine", locale)} maxLength={100} className="max-w-[16rem]" />
      <label className="flex items-start gap-[var(--space-2)]">
        <input type="checkbox" name="claimant.consentContact" className={checkbox} />
        <span>{L("lfcConsentContact", locale)}</span>
      </label>
      <SaveButton locale={locale} pending={pending} label={L("lfcClaimAdd", locale)} />
    </form>
  );
}

/** The claim review step: compare, then accept or reject (with a polite public message). */
export function ClaimReview({ locale, caseId, orgId, claimId, defaultReject, hasLost }: Base & { claimId: string; defaultReject: { th: string; en: string }; hasLost: boolean }) {
  const [state, run, pending] = useActionState<LfState, FormData>(decideClaimAction, EMPTY);
  const [rejecting, setRejecting] = useState(false);
  const prefix = useId().replace(/:/g, "");
  const errors = state.errors ?? {};
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-3)]">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      <input type="hidden" name="claimId" value={claimId} />
      {rejecting ? (
        <div className="flex flex-col gap-[var(--space-3)]">
          <InsetText>{L("lfcRejectHint", locale)}</InsetText>
          <Textarea id={control(prefix, "message.th")} name="message.th" lang="th" error={errors["message.th"]} label={`${L("lfcFieldRejectMessage", locale)} (${L("langThai", locale)})`} defaultValue={defaultReject.th} rows={3} maxLength={1000} />
          <Textarea id={control(prefix, "message.en")} name="message.en" lang="en" error={errors["message.en"]} label={`${L("lfcFieldRejectMessage", locale)} (${L("langEnglish", locale)})`} defaultValue={defaultReject.en} rows={3} maxLength={1000} />
          <div className="flex flex-wrap gap-[var(--space-2)]">
            <Button type="submit" name="decision" value="rejected" variant="destructive" loading={pending} loadingLabel={a("caseSaving", locale)}>
              {L("lfcRejectConfirm", locale)}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setRejecting(false)}>
              {L("lfcCancel", locale)}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <InsetText>{L("lfcCollectionHint", locale)}</InsetText>
          <Textarea id={control(prefix, "collection.th")} name="collection.th" lang="th" error={errors["collection.th"]} label={`${L("lfcFieldCollectionNote", locale)} (${L("langThai", locale)})`} rows={2} maxLength={1000} />
          <Textarea id={control(prefix, "collection.en")} name="collection.en" lang="en" error={errors["collection.en"]} label={`${L("lfcFieldCollectionNote", locale)} (${L("langEnglish", locale)})`} rows={2} maxLength={1000} />
          <div className="flex flex-wrap gap-[var(--space-2)]">
            <Button type="submit" name="decision" value="accepted" loading={pending} loadingLabel={a("caseSaving", locale)}>
              {L("lfcAccept", locale)}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setRejecting(true)}>
              {L("lfcReject", locale)}
            </Button>
          </div>
        </>
      )}
      <p className="m-0 text-sm text-ink-600">{L(hasLost ? "lfcDecisionNoteLost" : "lfcDecisionNote", locale)}</p>
    </form>
  );
}

/* Handover */

export function HandoverForm({ locale, caseId, orgId, desks, deskId, nowLocal, lostChoices, collectorKnown }: Base & { desks: Option[]; deskId: number; nowLocal: string; lostChoices: Option[]; collectorKnown: boolean }) {
  const [state, run, pending] = useActionState<LfState, FormData>(handoverAction, EMPTY);
  const prefix = useId().replace(/:/g, "");
  const errors = state.errors ?? {};
  const f = (name: string) => ({ id: control(prefix, name), name, error: errors[name] });
  return (
    <form action={run} noValidate className="flex flex-col gap-[var(--space-4)]" autoComplete="off">
      <Feedback state={state} locale={locale} prefix={prefix} />
      <HiddenIds caseId={caseId} orgId={orgId} />
      <TextInput {...f("collectedByName")} label={L("lfcFieldCollector", locale)} hint={L(collectorKnown ? "lfcFieldCollectorKnown" : "lfcFieldCollectorHint", locale)} maxLength={200} className="max-w-[24rem]" />
      <Select
        {...f("idCheckType")}
        label={L("lfcFieldIdCheck", locale)}
        hint={L("lfcFieldIdCheckHint", locale)}
        options={[{ value: "", label: L("choiceSelect", locale) }, ...ID_CHECK_TYPES.map((value) => ({ value, label: L(`lfcIdCheck_${value}` as AdminKey, locale) }))]}
        className="max-w-[24rem]"
      />
      <TextInput {...f("collectedAt")} type="datetime-local" label={L("lfcFieldCollectedAt", locale)} defaultValue={nowLocal} className="max-w-[20rem]" />
      <Select {...f("deskOrganisationId")} label={L("lfcFieldHandoverDesk", locale)} hint={L("lfcFieldHandoverDeskHint", locale)} options={desks} defaultValue={String(deskId)} className="max-w-[24rem]" />
      {lostChoices.length > 1 ? <Select {...f("lostCaseId")} label={L("lfcFieldLostReport", locale)} options={lostChoices} className="max-w-[24rem]" /> : lostChoices.length === 1 ? <input type="hidden" name="lostCaseId" value={lostChoices[0]!.value} /> : null}
      <InsetText>{L("lfcHandoverNoId", locale)}</InsetText>
      <SaveButton locale={locale} pending={pending} variant="primary" label={L("lfcHandoverSave", locale)} />
    </form>
  );
}
