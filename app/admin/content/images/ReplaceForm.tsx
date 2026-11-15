"use client";

import { useTransition } from "react";
import { uploadError, uploadNote } from "@/components/admin/content/upload/upload-machine";
import { useImageUpload } from "@/components/admin/content/upload/use-image-upload";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button } from "@/components/ui";
import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { replaceImageAction } from "./actions";

/**
 * Replaces the file behind a picture. Without JavaScript the form posts the
 * file as it is; with it the file is made smaller in the browser first.
 */
export function ReplaceForm({ id, locale }: { id: string; locale: Locale }) {
  const [pending, startTransition] = useTransition();
  const upload = useImageUpload<null>(locale);
  const error = uploadError(upload.state);
  const note = uploadNote(upload.state);
  const action = replaceImageAction.bind(null, id);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    startTransition(async () => {
      await upload.start(file instanceof File ? file : null, async (sent) => {
        if (sent) data.set("file", sent);
        await action(data);
        return { ok: true, result: null };
      });
    });
  }

  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col items-start gap-[var(--space-3)]">
      <div className="flex flex-col gap-[var(--space-1)]">
        <label htmlFor="media-replace-file" className="font-medium">
          {a("mlReplaceFile", locale)}
        </label>
        <span className="text-sm text-ink-600">{a("imageFileHint", locale, { mb: ADMIN_UPLOAD_MAX_BYTES / 1024 / 1024 })}</span>
        <input id="media-replace-file" name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/heic" />
      </div>
      {note ? (
        <p role="status" className="m-0 text-sm text-ink-600">
          {note}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 font-medium text-error">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" icon={<ConsoleIcon name="replaceFile" />} loading={pending} loadingLabel={a("mlReplacing", locale)}>
        {a("mlReplaceButton", locale)}
      </Button>
    </form>
  );
}
