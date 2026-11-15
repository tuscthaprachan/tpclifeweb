"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card } from "@/components/admin/ui";
import { Button, NotificationBanner, Stack, TextInput } from "@/components/ui";
import { isPreviewableSegment, isRevertibleSegment, isScheduledSegment } from "@/lib/admin/content/capabilities";
import { formatBangkokDateTime } from "@/lib/admin/content/datetime";
import { fieldId } from "@/lib/admin/content/form-state";
import { duplicateItem, saveSchedule, type ScheduleFormState } from "@/lib/admin/content/lifecycle-actions";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { useContentForm } from "./context";
import { PortalDialog } from "./PortalDialog";

interface LifecycleToolsProps {
  locale: Locale;
  segment: string;
  id: string;
  publishAt?: string | null;
  unpublishAt?: string | null;
}

const EMPTY: ScheduleFormState = { errors: {} };

function SchedulePanel({ locale, segment, id, publishAt, unpublishAt }: LifecycleToolsProps) {
  const [state, action, pending] = useActionState(saveSchedule, EMPTY);
  return (
    <Card title={a("clcScheduleTitle", locale)} icon="scheduled" level={2}>
      <form action={action} noValidate>
        <input type="hidden" name="segment" value={segment} />
        <input type="hidden" name="id" value={id} />
        <Stack space={3}>
          <p className="m-0 text-sm text-ink-600">{a("clcScheduleHint", locale)}</p>
          {state.formError ? (
            <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
              {state.formError}
            </NotificationBanner>
          ) : null}
          <TextInput
            id={fieldId("publishAt")}
            name="publishAt"
            type="datetime-local"
            label={a("clcPublishAt", locale)}
            hint={a("clcPublishAtHint", locale)}
            error={state.errors.publishAt}
            defaultValue={formatBangkokDateTime(publishAt)}
          />
          <TextInput
            id={fieldId("unpublishAt")}
            name="unpublishAt"
            type="datetime-local"
            label={a("clcUnpublishAt", locale)}
            hint={a("clcUnpublishAtHint", locale)}
            error={state.errors.unpublishAt}
            defaultValue={formatBangkokDateTime(unpublishAt)}
          />
          <div>
            <Button type="submit" variant="secondary" icon={<ConsoleIcon name="scheduled" />} loading={pending} loadingLabel={a("formSaving", locale)}>
              {a("clcScheduleSave", locale)}
            </Button>
          </div>
        </Stack>
      </form>
    </Card>
  );
}

/**
 * Duplicate with a confirmation. Without JavaScript the button posts the form
 * straight away (the action only ever adds a draft). With it, a dialog asks
 * first and says that unsaved changes stay out of the copy; once confirmed the
 * form submits through its Server Action, which holds further clicks while it runs.
 */
function DuplicateForm({ locale, segment, id }: Pick<LifecycleToolsProps, "locale" | "segment" | "id">) {
  const { dirty = false, pending: saving } = useContentForm();
  const form = useRef<HTMLFormElement | null>(null);
  const confirmed = useRef(false);
  const [asking, setAsking] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmed.current) return;
    event.preventDefault();
    setAsking(true);
  }
  function confirm() {
    confirmed.current = true;
    setAsking(false);
    form.current?.requestSubmit();
    confirmed.current = false;
  }

  return (
    <form ref={form} action={duplicateItem} onSubmit={onSubmit}>
      <input type="hidden" name="segment" value={segment} />
      <input type="hidden" name="id" value={id} />
      <Stack space={2}>
        <p className="m-0 text-sm text-ink-600">{a("clcDuplicateHint", locale)}</p>
        <div>
          <Button type="submit" variant="secondary" icon={<ConsoleIcon name="duplicate" />} disabled={saving} loadingLabel={a("clcDuplicating", locale)}>
            {a("clcDuplicate", locale)}
          </Button>
        </div>
      </Stack>
      <PortalDialog open={asking} onClose={() => setAsking(false)} title={a("clcDuplicateTitle", locale)} headingLevel={2} locale={locale}>
        <Stack space={4}>
          <p className="m-0">{a("clcDuplicateBody", locale)}</p>
          {dirty ? <p className="m-0 font-medium">{a("clcDuplicateUnsaved", locale)}</p> : null}
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <Button type="button" onClick={confirm} icon={<ConsoleIcon name="duplicate" />}>
              {a("clcDuplicateConfirm", locale)}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setAsking(false)}>
              {a("cancel", locale)}
            </Button>
          </div>
        </Stack>
      </PortalDialog>
    </form>
  );
}

/** Side column cards on an edit page: scheduling, preview, duplicate and history. Each shows only for the types that support it. */
export function LifecycleTools(props: LifecycleToolsProps) {
  const { locale, segment, id } = props;
  const preview = isPreviewableSegment(segment);
  const duplicate = isRevertibleSegment(segment);
  return (
    <>
      {isScheduledSegment(segment) ? <SchedulePanel {...props} /> : null}
      <Card title={a("clcToolsTitle", locale)} icon="edit" level={2}>
        <Stack space={3}>
          {preview ? (
            <form method="post" action="/api/preview" target="_blank">
              <input type="hidden" name="segment" value={segment} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="locale" value={locale} />
              <Stack space={2}>
                <p className="m-0 text-sm text-ink-600">{a("clcPreviewHint", locale)}</p>
                <div>
                  <Button type="submit" variant="secondary" icon={<ConsoleIcon name="preview" />}>
                    {a("clcPreview", locale)}
                    <span className="visually-hidden"> ({UI.opensInNewTab[locale]})</span>
                  </Button>
                </div>
              </Stack>
            </form>
          ) : null}
          {duplicate ? <DuplicateForm locale={locale} segment={segment} id={id} /> : null}
          <div>
            <Button href={`/admin/content/${segment}/${id}/history`} variant="secondary" icon={<ConsoleIcon name="history" />}>
              {a("clcHistoryLink", locale)}
            </Button>
          </div>
        </Stack>
      </Card>
    </>
  );
}
