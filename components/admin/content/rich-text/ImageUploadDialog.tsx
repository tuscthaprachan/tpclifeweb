"use client";

import { useId, useState, useTransition } from "react";
import { uploadImageAction } from "@/app/admin/content/actions";
import { Button, Checkboxes, ErrorMessage, NotificationBanner, TextInput } from "@/components/ui";
import type { ImageChoice } from "@/lib/admin/content/images";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { compressInBrowser } from "../compress-image-browser";
import { PortalDialog } from "../PortalDialog";

interface ImageUploadDialogProps {
  /** The picture that was pasted or dropped; null closes the dialog. */
  file: File | null;
  locale: Locale;
  storageConfigured: boolean;
  onClose: () => void;
  onUploaded: (image: ImageChoice, alt: { th: string; en: string }) => void;
}

/** Asks for the alternative text, then uploads the pasted or dropped picture through the same compression and action the image picker uses. */
export function ImageUploadDialog({ file, locale, storageConfigured, onClose, onUploaded }: ImageUploadDialogProps) {
  const uid = useId();
  const [altTh, setAltTh] = useState("");
  const [altEn, setAltEn] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, start] = useTransition();

  function submit() {
    if (!file) return;
    setError(null);
    start(async () => {
      const compressed = await compressInBrowser(file);
      if (compressed.status === "failed") return setError(a(compressed.reason === "decode" ? "errUploadCompressDecode" : "errUploadCompressStill", locale));
      const data = new FormData();
      data.set("file", compressed.file);
      data.set("altTh", altTh);
      data.set("altEn", altEn);
      if (decorative) data.set("isDecorative", "on");
      const result = await uploadImageAction(data);
      if (!result.ok) return setError(result.error);
      onUploaded(result.image, { th: altTh.trim(), en: altEn.trim() });
    });
  }

  return (
    <PortalDialog open={file !== null} onClose={onClose} title={a("edPasteTitle", locale)} headingLevel={2} locale={locale} className="w-[min(100vw-2rem,32rem)]">
      {file ? (
        <div className="flex flex-col gap-[var(--space-3)]">
          <p className="m-0 text-sm text-ink-600">
            {file.name || a("blockImage", locale)}. {a("edPasteHint", locale)}
          </p>
          {storageConfigured ? (
            <>
              {decorative ? null : (
                <>
                  <TextInput id={`${uid}-th`} label={a("imageAltTh", locale)} lang="th" value={altTh} onChange={(e) => setAltTh(e.target.value)} autoComplete="off" />
                  <TextInput id={`${uid}-en`} label={a("imageAltEn", locale)} lang="en" value={altEn} onChange={(e) => setAltEn(e.target.value)} autoComplete="off" />
                </>
              )}
              <Checkboxes
                id={`${uid}-decorative`}
                name={`${uid}-decorative`}
                legend={a("blockImageDecorative", locale)}
                options={[{ value: "yes", label: a("imageDecorativeLabel", locale) }]}
                value={decorative ? ["yes"] : []}
                onValueChange={(v) => setDecorative(v.includes("yes"))}
              />
              {error ? <ErrorMessage id={`${uid}-error`}>{error}</ErrorMessage> : null}
              <div className="flex flex-wrap gap-[var(--space-3)]">
                <Button type="button" onClick={submit} loading={working} loadingLabel={a("edPasteWorking", locale)}>
                  {a("edPasteAdd", locale)}
                </Button>
                <Button type="button" variant="quiet" onClick={onClose}>
                  {a("cancel", locale)}
                </Button>
              </div>
            </>
          ) : (
            <NotificationBanner variant="info" title={a("storageNotConfiguredTitle", locale)}>
              {a("errStorageNotConfigured", locale)}
            </NotificationBanner>
          )}
        </div>
      ) : null}
    </PortalDialog>
  );
}
