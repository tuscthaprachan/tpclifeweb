"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadImageAction } from "@/app/admin/content/actions";
import { compressInBrowser } from "@/components/admin/content/compress-image-browser";
import { formatMegabytes } from "@/components/admin/content/compress-image";
import { Button, ErrorSummary, TextInput } from "@/components/ui";
import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

/**
 * Uploads one picture with its description through the shared
 * `uploadImageAction`, then opens it for a caption or credit.
 */
export function UploadForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [decorative, setDecorative] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    setError(null);
    setNote(null);
    startTransition(async () => {
      if (file instanceof File && file.size > 0) {
        const compressed = await compressInBrowser(file);
        if (compressed.status === "failed") return setError(a(compressed.reason === "decode" ? "errUploadCompressDecode" : "errUploadCompressStill", locale));
        if (compressed.status === "compressed") {
          setNote(a("imageCompressed", locale, { from: formatMegabytes(compressed.originalBytes), to: formatMegabytes(compressed.compressedBytes) }));
        }
        data.set("file", compressed.file);
      }
      const result = await uploadImageAction(data);
      if (!result.ok) return setError(result.error);
      router.push(`/admin/content/images/${result.image.id}?uploaded=1`);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[var(--space-4)]">
      {error ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#media-file", message: error }]} /> : null}
      <div className="flex flex-col gap-[var(--space-1)]">
        <label htmlFor="media-file" className="font-medium">
          {a("imageFile", locale)}
        </label>
        <span className="text-sm text-ink-600">{a("imageFileHint", locale, { mb: ADMIN_UPLOAD_MAX_BYTES / 1024 / 1024 })}</span>
        <input id="media-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic" />
      </div>
      <div className="grid gap-[var(--space-4)] md:grid-cols-2">
        <TextInput id="media-alt-th" name="altTh" lang="th" label={a("imageAltTh", locale)} autoComplete="off" disabled={decorative} />
        <TextInput id="media-alt-en" name="altEn" lang="en" label={a("imageAltEn", locale)} autoComplete="off" disabled={decorative} />
      </div>
      <label className="flex items-center gap-[var(--space-2)]">
        <input type="checkbox" name="isDecorative" className="size-5" checked={decorative} onChange={(e) => setDecorative(e.target.checked)} />
        {a("imageDecorativeLabel", locale)}
      </label>
      {note ? (
        <p role="status" className="m-0 text-sm text-ink-600">
          {note}
        </p>
      ) : null}
      <div>
        <Button type="submit" loading={pending} loadingLabel={a("imageUploading", locale)}>
          {a("imageUpload", locale)}
        </Button>
      </div>
    </form>
  );
}
