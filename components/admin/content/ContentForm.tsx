"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { ActionBar, Card, FormLayout, KeyValue } from "@/components/admin/ui";
import { Button, ErrorSummary, NotificationBanner, Stack, StatusTag, Timestamp, type ErrorSummaryItem } from "@/components/ui";
import { EMPTY_FORM_STATE, fieldId, type ContentFormState, type SaveIntent } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ContentFormProvider } from "./context";
import { PortalDialog } from "./PortalDialog";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

export interface ContentRecordInfo {
  id: string;
  status: "draft" | "published" | null;
  /** ISO string. */
  updatedAt: string;
  updatedByName?: string | null;
  /** Public page, shown as "View on site" once published. */
  viewHref?: string;
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

const SAVED_KEY = { saved: "formSavedDraft", published: "formSavedPublished", unpublished: "formSavedUnpublished", updated: "formSavedUpdated" } as const;

/**
 * The shell around every content form: error summary, the fields in the main
 * column, a side column with status, last saved, "View on site" and a danger
 * zone (Delete, with confirmation), a sticky action bar with the save buttons,
 * and a warning before leaving with unsaved changes. Key it on `record.updatedAt` so a save remounts it
 * with the stored values:
 *
 *   <ContentForm key={row.updatedAt.toISOString()} ...>
 */
export function ContentForm({ locale, action, record, deleteAction, listHref, saved, hasStatus = true, children }: ContentFormProps) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [intent, setIntent] = useState<SaveIntent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const submitted = useRef(false);
  const formId = useId();

  const markDirty = useMemo(() => () => setDirty(true), []);

  useEffect(() => {
    if (!pending && submitted.current && Object.keys(state.errors).length === 0 && !state.formError) setDirty(false);
  }, [pending, state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    // Not `action={formAction}`: React would reset the fields after a failed save and the typing would be lost.
    const data = new FormData(event.currentTarget, submitter);
    setIntent((data.get("intent") as SaveIntent | null) ?? "save");
    submitted.current = true;
    startTransition(() => formAction(data));
  }

  const items: ErrorSummaryItem[] = Object.entries(state.errors).map(([path, message]) => ({ href: `#${fieldId(path)}`, message }));
  const status = record?.status ?? null;
  const savedKey = saved && saved in SAVED_KEY ? SAVED_KEY[saved as keyof typeof SAVED_KEY] : null;
  const live = status === "published" && record?.viewHref;

  const busy = (which: SaveIntent) => pending && intent === which;
  const submit = { type: "submit" as const, form: formId, name: "intent", loadingLabel: a("formSaving", locale), disabled: pending };

  const aside = (
    <Stack space={4}>
      <Card title={a("cfStatus", locale)} icon="info" level={2}>
        <Stack space={3}>
          {hasStatus ? (
            status ? (
              <StatusTag tone={status === "published" ? "success" : "neutral"} label={a(status === "published" ? "statusPublished" : "statusDraft", locale)} />
            ) : (
              <StatusTag tone="info" label={a("cfNew", locale)} />
            )
          ) : null}
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
      {record && deleteAction ? (
        <Card title={a("cfDanger", locale)} icon="warning" level={2}>
          <Stack space={3}>
            <p className="m-0 text-sm text-ink-600">{a("cfDangerHint", locale)}</p>
            <div>
              <Button type="button" variant="destructive" icon={<ConsoleIcon name="delete" />} onClick={() => setConfirmingDelete(true)} disabled={pending}>
                {a("formDelete", locale)}
              </Button>
            </div>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );

  return (
    <ContentFormProvider value={{ locale, errors: state.errors, pending, markDirty }}>
      <UnsavedChangesGuard dirty={dirty} locale={locale} />
      <FormLayout aside={aside}>
        <form id={formId} onSubmit={onSubmit} onChange={markDirty} noValidate>
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
        <Button href={listHref} variant="quiet" icon={<ConsoleIcon name="back" />}>
          {a("formBackToList", locale)}
        </Button>
      </ActionBar>

      {record && deleteAction ? (
        <PortalDialog open={confirmingDelete} onClose={() => setConfirmingDelete(false)} title={a("formDeleteTitle", locale)} headingLevel={2} locale={locale}>
          <form action={deleteAction}>
            <Stack space={4}>
              <p className="m-0">{a("formDeleteBody", locale)}</p>
              <div className="flex flex-wrap gap-[var(--space-3)]">
                <Button type="submit" variant="destructive">
                  {a("formDeleteConfirm", locale)}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)}>
                  {a("formDeleteCancel", locale)}
                </Button>
              </div>
            </Stack>
          </form>
        </PortalDialog>
      ) : null}
    </ContentFormProvider>
  );
}
