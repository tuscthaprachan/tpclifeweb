"use client";

import { useActionState, useCallback, useEffect, useId, useReducer, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { ActionBar, Card, FormLayout, KeyValue } from "@/components/admin/ui";
import { Button, ErrorSummary, NotificationBanner, Stack, StatusTag, Timestamp, type ErrorSummaryItem } from "@/components/ui";
import { scheduleState } from "@/lib/admin/content/schedule";
import { EMPTY_FORM_STATE, fieldId, type ContentFormState, type SaveIntent } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ContentFormProvider } from "./context";
import { LifecycleTools } from "./LifecycleTools";
import { contentFormReducer, hasEditsInFlight, initialContentForm, isContentFormDirty, isContentFormSaving } from "./form/content-form-machine";
import { DeleteDialog } from "./form/DeleteDialog";
import { formEntries, restoreEntries, stashEdits, takeEdits, type FormEntries } from "./form/edit-stash";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

export interface ContentRecordInfo {
  id: string;
  status: "draft" | "published" | null;
  /** ISO string. */
  updatedAt: string;
  updatedByName?: string | null;
  /** Public page, shown as "View on site" once published. */
  viewHref?: string;
  /** ISO strings, for types with a publication window. */
  publishAt?: string | null;
  unpublishAt?: string | null;
}

interface ContentFormProps {
  locale: Locale;
  /** The type's Server Action: `(prev, formData) => state`, redirecting on success. */
  action: (prev: ContentFormState, formData: FormData) => Promise<ContentFormState>;
  /** Present when editing; absent on the "new" page. */
  record?: ContentRecordInfo;
  /** Takes the form's `FormData` (nothing needed from it; the id is bound in). Omit to hide Delete. */
  deleteAction?: (formData: FormData) => Promise<void>;
  /** Where "Back to the list" goes. */
  listHref: string;
  /** Result of the last save, from the `?saved=` query on the edit page. */
  saved?: string;
  /** Hide the draft/publish buttons for types with no status (images). They get a single Save. */
  hasStatus?: boolean;
  children: ReactNode;
}

const SAVED_KEY = { saved: "formSavedDraft", published: "formSavedPublished", unpublished: "formSavedUnpublished", updated: "formSavedUpdated", duplicated: "clcSavedDuplicated", restored: "clcSavedRestored", scheduled: "clcSavedScheduled" } as const;

/**
 * The shell around every content form: error summary, the fields in the main
 * column, a side column with status, last saved, "View on site" and a danger
 * zone (Delete, with confirmation), a sticky action bar with the save buttons,
 * and a warning before leaving with unsaved changes. Its state is the
 * `content-form-machine`: a second submit while one is saving is ignored, and
 * text typed during a save is put back after the reload with a warning, never
 * dropped. Key it on `record.updatedAt` so a save remounts it with the stored values:
 *
 *   <ContentForm key={row.updatedAt.toISOString()} ...>
 */
export function ContentForm({ locale, action, record, deleteAction, listHref, saved, hasStatus = true, children }: ContentFormProps) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [machine, send] = useReducer(contentFormReducer, initialContentForm);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [restored, setRestored] = useState(false);
  const form = useRef<HTMLFormElement | null>(null);
  const latest = useRef(machine);
  const inFlight = useRef<FormEntries>([]);
  const sawPending = useRef(false);
  const formId = useId();
  const stashKey = record ? `${listHref}:${record.id}` : null;
  const dirty = isContentFormDirty(machine);
  const saving = isContentFormSaving(machine);
  const intent = saving ? machine.intent : null;

  useEffect(() => {
    latest.current = machine;
  });

  const markDirty = useCallback(() => {
    send({ type: "edit" });
    if (isContentFormSaving(latest.current) && form.current) inFlight.current = formEntries(form.current);
  }, []);

  useEffect(() => {
    if (pending) {
      sawPending.current = true;
      return;
    }
    if (!sawPending.current) return;
    sawPending.current = false;
    send({ type: Object.keys(state.errors).length > 0 || state.formError ? "failed" : "succeeded" });
  }, [pending, state]);

  useEffect(() => {
    const entries = stashKey ? takeEdits(stashKey) : null;
    if (entries && form.current) {
      restoreEntries(form.current, entries);
      send({ type: "edit" });
      setRestored(true);
    }
    return () => {
      if (stashKey && hasEditsInFlight(latest.current)) stashEdits(stashKey, inFlight.current);
    };
  }, [stashKey]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isContentFormSaving(latest.current)) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    // Not `action={formAction}`: React would reset the fields after a failed save and the typing would be lost.
    const data = new FormData(event.currentTarget, submitter);
    send({ type: "submit", intent: (data.get("intent") as SaveIntent | null) ?? "save" });
    latest.current = contentFormReducer(latest.current, { type: "submit", intent: (data.get("intent") as SaveIntent | null) ?? "save" });
    startTransition(() => formAction(data));
  }

  const items: ErrorSummaryItem[] = Object.entries(state.errors).map(([path, message]) => ({ href: `#${fieldId(path)}`, message }));
  const status = record?.status ?? null;
  const savedKey = saved && saved in SAVED_KEY ? SAVED_KEY[saved as keyof typeof SAVED_KEY] : null;
  const segment = listHref.split("/").filter(Boolean).pop() ?? "";
  const phase = record ? scheduleState({ status, publishAt: record.publishAt, unpublishAt: record.unpublishAt }) : "draft";
  const live = phase === "live" && record?.viewHref;
  const whenText = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(iso)) : "");

  const busy = (which: SaveIntent) => saving && intent === which;
  const submit = { type: "submit" as const, form: formId, name: "intent", loadingLabel: a("formSaving", locale), disabled: saving || pending };

  const aside = (
    <Stack space={4}>
      <Card title={a("cfStatus", locale)} icon="info" level={2}>
        <Stack space={3}>
          {hasStatus ? (
            status ? (
              <StatusTag
                tone={phase === "scheduled" ? "info" : phase === "expired" ? "warning" : status === "published" ? "success" : "neutral"}
                label={phase === "scheduled" ? a("clcStatusScheduled", locale) : phase === "expired" ? a("clcStatusExpired", locale) : a(status === "published" ? "statusPublished" : "statusDraft", locale)}
              />
            ) : (
              <StatusTag tone="info" label={a("cfNew", locale)} />
            )
          ) : null}
          {phase === "scheduled" ? <p className="m-0 text-sm text-ink-600">{a("clcScheduledNote", locale, { when: whenText(record?.publishAt) })}</p> : null}
          {phase === "expired" ? <p className="m-0 text-sm text-ink-600">{a("clcExpiredNote", locale, { when: whenText(record?.unpublishAt) })}</p> : null}
          {phase === "live" && record?.unpublishAt ? <p className="m-0 text-sm text-ink-600">{a("clcEndsNote", locale, { when: whenText(record.unpublishAt) })}</p> : null}
          {record ? (
            <KeyValue
              items={[
                { label: a("formLastSaved", locale), value: <Timestamp value={record.updatedAt} locale={locale} format="datetime" /> },
                ...(record.updatedByName ? [{ label: a("cfSavedBy", locale), value: record.updatedByName }] : []),
              ]}
            />
          ) : (
            <p className="m-0 text-sm text-ink-600">{a("cfNotSavedYet", locale)}</p>
          )}
          {live ? (
            <a href={record.viewHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
              <ConsoleIcon name="viewLive" />
              <span>{a("formViewOnSite", locale)}</span>
              <span className="visually-hidden"> ({UI.opensInNewTab[locale]})</span>
            </a>
          ) : null}
        </Stack>
      </Card>
      {record && hasStatus && segment ? <LifecycleTools locale={locale} segment={segment} id={record.id} publishAt={record.publishAt} unpublishAt={record.unpublishAt} /> : null}
      {record && deleteAction ? (
        <Card title={a("cfDanger", locale)} icon="warning" level={2}>
          <Stack space={3}>
            <p className="m-0 text-sm text-ink-600">{a("cfDangerHint", locale)}</p>
            <div>
              <Button type="button" variant="destructive" icon={<ConsoleIcon name="delete" />} onClick={() => setConfirmingDelete(true)} disabled={saving || pending}>
                {a("formDelete", locale)}
              </Button>
            </div>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );

  return (
    <ContentFormProvider value={{ locale, errors: state.errors, pending: saving || pending, dirty, markDirty }}>
      <UnsavedChangesGuard dirty={dirty} locale={locale} />
      <FormLayout aside={aside}>
        <form ref={form} id={formId} onSubmit={onSubmit} onChange={markDirty} noValidate>
          <Stack space={6}>
            {savedKey && !dirty ? (
              <NotificationBanner variant="success" title={a(savedKey, locale)}>
                {live ? (
                  <a href={record.viewHref} target="_blank" rel="noopener noreferrer">
                    {a("formViewOnSite", locale)}
                    <span className="visually-hidden"> ({UI.opensInNewTab[locale]})</span>
                  </a>
                ) : (
                  a(status === "published" ? "formSavedLiveNote" : "formSavedNote", locale)
                )}
              </NotificationBanner>
            ) : null}
            {restored ? (
              <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
                {a("cfEditedDuringSave", locale)}
              </NotificationBanner>
            ) : null}
            {state.formError ? (
              <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
                {state.formError}
              </NotificationBanner>
            ) : null}
            {items.length > 0 ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={items} /> : null}

            {children}
          </Stack>
        </form>
      </FormLayout>

      <ActionBar state={dirty ? "dirty" : record ? "saved" : "idle"} dirtyText={a("csDirty", locale)} savedText={a("csSaved", locale)}>
        {hasStatus ? (
          status === "published" ? (
            <>
              <Button {...submit} value="save" icon={<ConsoleIcon name="save" />} loading={busy("save")}>
                {a("formSaveChanges", locale)}
              </Button>
              <Button {...submit} value="unpublish" variant="secondary" icon={<ConsoleIcon name="draft" />} loading={busy("unpublish")}>
                {a("formUnpublish", locale)}
              </Button>
            </>
          ) : (
            <>
              <Button {...submit} value="publish" icon={<ConsoleIcon name="publish" />} loading={busy("publish")}>
                {a("formPublish", locale)}
              </Button>
              <Button {...submit} value="save" variant="secondary" icon={<ConsoleIcon name="draft" />} loading={busy("save")}>
                {a("formSaveDraft", locale)}
              </Button>
            </>
          )
        ) : (
          <Button {...submit} value="save" icon={<ConsoleIcon name="save" />} loading={busy("save")}>
            {a("formSave", locale)}
          </Button>
        )}
        <span className="max-sm:hidden">
          <Button href={listHref} variant="quiet" icon={<ConsoleIcon name="back" />}>
            {a("formBackToList", locale)}
          </Button>
        </span>
      </ActionBar>

      {record && deleteAction ? <DeleteDialog locale={locale} open={confirmingDelete} onClose={() => setConfirmingDelete(false)} action={deleteAction} dirty={dirty} saving={saving || pending} /> : null}
    </ContentFormProvider>
  );
}
