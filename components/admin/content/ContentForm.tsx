"use client";

import { useActionState, useEffect, useMemo, useRef, useState, startTransition, type FormEvent, type ReactNode } from "react";
import { Button, ErrorSummary, NotificationBanner, Stack, Timestamp, type ErrorSummaryItem } from "@/components/ui";
import { EMPTY_FORM_STATE, fieldId, type ContentFormState, type SaveIntent } from "@/lib/admin/content/form-state";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ContentFormProvider } from "./context";
import { PortalDialog } from "./PortalDialog";

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
 * The shell around every content form: error summary, status buttons, Delete
 * with confirmation, "View on site", last saved, and a warning before leaving
 * with unsaved changes. Key it on `record.updatedAt` so a save remounts it
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

  const markDirty = useMemo(() => () => setDirty(true), []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

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

  const busy = (which: SaveIntent) => pending && intent === which;

  return (
    <ContentFormProvider value={{ locale, errors: state.errors, pending, markDirty }}>
      <form onSubmit={onSubmit} onChange={markDirty} noValidate>
        <Stack space={6}>
          {savedKey && !dirty ? (
            <NotificationBanner variant="success" title={a(savedKey, locale)}>
              {status === "published" && record?.viewHref ? (
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

          <div className="flex flex-wrap items-center gap-[var(--space-3)] border-t border-line pt-[var(--space-4)]">
            {hasStatus ? (
              status === "published" ? (
                <>
                  <Button type="submit" name="intent" value="save" loading={busy("save")} loadingLabel={a("formSaving", locale)} disabled={pending}>
                    {a("formSaveChanges", locale)}
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value="unpublish"
                    variant="secondary"
                    loading={busy("unpublish")}
                    loadingLabel={a("formSaving", locale)}
                    disabled={pending}
                  >
                    {a("formUnpublish", locale)}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="submit" name="intent" value="publish" loading={busy("publish")} loadingLabel={a("formSaving", locale)} disabled={pending}>
                    {a("formPublish", locale)}
                  </Button>
                  <Button
                    type="submit"
                    name="intent"
                    value="save"
                    variant="secondary"
                    loading={busy("save")}
                    loadingLabel={a("formSaving", locale)}
                    disabled={pending}
                  >
                    {a("formSaveDraft", locale)}
                  </Button>
                </>
              )
            ) : (
              <Button type="submit" name="intent" value="save" loading={busy("save")} loadingLabel={a("formSaving", locale)} disabled={pending}>
                {a("formSave", locale)}
              </Button>
            )}
            <Button href={listHref} variant="quiet">
              {a("formBackToList", locale)}
            </Button>
            {record && deleteAction ? (
              <Button type="button" variant="quiet" className="ml-auto" onClick={() => setConfirmingDelete(true)} disabled={pending}>
                {a("formDelete", locale)}
              </Button>
            ) : null}
          </div>

          {record ? (
            <p className="m-0 text-sm text-ink-600">
              {a("formLastSaved", locale)} <Timestamp value={record.updatedAt} locale={locale} format="datetime" />
              {record.updatedByName ? ` ${a("formLastSavedBy", locale, { name: record.updatedByName })}` : ""}
              {status ? ` · ${a(status === "published" ? "statusPublished" : "statusDraft", locale)}` : ""}
            </p>
          ) : null}
        </Stack>
      </form>

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
