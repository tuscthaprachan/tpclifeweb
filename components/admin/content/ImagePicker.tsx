"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { uploadImageAction } from "@/app/admin/content/actions";
import { Button, ErrorMessage, NotificationBanner } from "@/components/ui";
import { fieldId } from "@/lib/admin/content/form-state";
import type { ImageChoice } from "@/lib/admin/content/images";
import { ADMIN_UPLOAD_MAX_BYTES } from "@/lib/admin/content/upload-limit";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { useContentForm } from "./context";
import { PortalDialog } from "./PortalDialog";

interface ImagePickerProps {
  /** Form name. Posts one value per chosen picture (an image id), in order. */
  name: string;
  label: string;
  hint?: string;
  images: ImageChoice[];
  /** From `isStorageConfigured()`. When false, choosing still works but uploading says why it cannot. */
  storageConfigured: boolean;
  defaultValue?: string[];
  /** Several pictures, reorderable. Default is one. */
  multiple?: boolean;
  /** Called with the chosen ids on every change, for callers that hold the value themselves (the rich text image dialog). */
  onChange?: (ids: string[]) => void;
  /** Do not post hidden inputs; the caller reads `onChange`. */
  unnamed?: boolean;
}

function Thumb({ image, size = 64 }: { image: ImageChoice | undefined; size?: number }) {
  if (!image?.url) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-control bg-surface-sunk text-xs text-ink-600"
        style={{ width: size, height: size }}
      >
        ?
      </span>
    );
  }
  return <Image src={image.url} alt="" width={size} height={size} unoptimized className="shrink-0 rounded-control bg-surface-sunk object-cover" style={{ width: size, height: size }} />;
}

/**
 * Choose pictures from the library, or upload a new one (with its alt text).
 * Posts the chosen image ids under `name`.
 */
export function ImagePicker({ name, label, hint, images: initial, storageConfigured, defaultValue = [], multiple = false, onChange, unnamed }: ImagePickerProps) {
  const { errors, locale, markDirty } = useContentForm();
  const [library, setLibrary] = useState(initial);
  const [chosen, setChosen] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const byId = new Map(library.map((i) => [i.id, i]));
  const id = fieldId(name);
  const error = errors[name];

  const update = (next: string[]) => {
    setChosen(next);
    markDirty();
    onChange?.(next);
  };
  const toggle = (imageId: string) => {
    if (!multiple) {
      update([imageId]);
      setOpen(false);
    } else update(chosen.includes(imageId) ? chosen.filter((x) => x !== imageId) : [...chosen, imageId]);
  };
  const move = (index: number, by: -1 | 1) => {
    const next = [...chosen];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    update(next);
  };
  const altOf = (image: ImageChoice | undefined) =>
    image ? (image.isDecorative ? a("imageDecorative", locale) : pick({ th: image.altTh, en: image.altEn }, locale) || a("imageNoAlt", locale)) : a("imageMissing", locale);

  function upload(form: HTMLElement) {
    const field = (n: string) => form.querySelector<HTMLInputElement>(`[data-upload="${n}"]`);
    const data = new FormData();
    const file = field("file")?.files?.[0];
    if (file) data.set("file", file);
    data.set("altTh", field("altTh")?.value ?? "");
    data.set("altEn", field("altEn")?.value ?? "");
    if (field("isDecorative")?.checked) data.set("isDecorative", "on");
    setUploadError(null);
    if (file && file.size > ADMIN_UPLOAD_MAX_BYTES) {
      setUploadError(a("errUploadTooLarge", locale));
      return;
    }
    startUpload(async () => {
      const result = await uploadImageAction(data);
      if (!result.ok) return setUploadError(result.error);
      setLibrary((current) => [result.image, ...current]);
      if (multiple) update([...chosen, result.image.id]);
      else {
        update([result.image.id]);
        setOpen(false);
      }
    });
  }

  return (
    <div id={id} tabIndex={-1} className="flex flex-col gap-[var(--space-2)]">
      <p className="m-0 text-base font-medium text-ink-900">{label}</p>
      {hint ? <p className="m-0 text-sm text-ink-600">{hint}</p> : null}
      {!unnamed ? chosen.map((imageId) => <input key={imageId} type="hidden" name={name} value={imageId} />) : null}

      {chosen.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
          {chosen.map((imageId, index) => (
            <li key={imageId} className="flex flex-wrap items-center gap-[var(--space-3)] rounded-control border border-line p-[var(--space-2)]">
              <Thumb image={byId.get(imageId)} />
              <span className="min-w-0 flex-1 text-sm">{altOf(byId.get(imageId))}</span>
              <span className="flex flex-wrap gap-[var(--space-1)]">
                {multiple && index > 0 ? (
                  <Button type="button" variant="quiet" size="sm" onClick={() => move(index, -1)}>
                    {a("moveUp", locale)}
                    <span className="visually-hidden"> {altOf(byId.get(imageId))}</span>
                  </Button>
                ) : null}
                {multiple && index < chosen.length - 1 ? (
                  <Button type="button" variant="quiet" size="sm" onClick={() => move(index, 1)}>
                    {a("moveDown", locale)}
                    <span className="visually-hidden"> {altOf(byId.get(imageId))}</span>
                  </Button>
                ) : null}
                <Button type="button" variant="quiet" size="sm" onClick={() => update(chosen.filter((x) => x !== imageId))}>
                  {a("remove", locale)}
                  <span className="visually-hidden"> {altOf(byId.get(imageId))}</span>
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-ink-600">{a("imageNoneChosen", locale)}</p>
      )}
      {error ? <ErrorMessage id={`${id}-error`}>{error}</ErrorMessage> : null}
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {multiple ? a("imageAdd", locale) : chosen.length > 0 ? a("imageChange", locale) : a("imageChoose", locale)}
        </Button>
      </div>

      <PortalDialog open={open} onClose={() => setOpen(false)} title={a("imageDialogTitle", locale)} headingLevel={2} locale={locale} className="w-[min(100vw-2rem,48rem)]">
        <div className="flex flex-col gap-[var(--space-6)]">
          <section aria-labelledby={`${id}-library`}>
            <h3 id={`${id}-library`} className="m-0 mb-[var(--space-2)] text-lg font-semibold">
              {a("imageLibrary", locale)}
            </h3>
            {library.length === 0 ? (
              <p className="m-0 text-ink-600">{a("imageLibraryEmpty", locale)}</p>
            ) : (
              <ul className="m-0 grid max-h-[18rem] list-none grid-cols-2 gap-[var(--space-2)] overflow-y-auto p-0 sm:grid-cols-3">
                {library.map((image) => (
                  <li key={image.id}>
                    <button
                      type="button"
                      aria-pressed={chosen.includes(image.id)}
                      onClick={() => toggle(image.id)}
                      className="flex min-h-[var(--target-min)] w-full flex-col items-start gap-[var(--space-1)] rounded-control border border-line p-[var(--space-2)] text-left aria-pressed:border-[length:var(--border-width-thick)] aria-pressed:border-action"
                    >
                      <Thumb image={image} size={96} />
                      <span className="text-sm">{altOf(image)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {multiple ? (
              <div className="mt-[var(--space-3)]">
                <Button type="button" onClick={() => setOpen(false)}>
                  {a("done", locale)}
                </Button>
              </div>
            ) : null}
          </section>

          <section aria-labelledby={`${id}-upload`} className="border-t border-line pt-[var(--space-4)]">
            <h3 id={`${id}-upload`} className="m-0 mb-[var(--space-2)] text-lg font-semibold">
              {a("imageUploadTitle", locale)}
            </h3>
            {storageConfigured ? (
              <div className="flex flex-col gap-[var(--space-3)]" data-upload-form>
                <div className="flex flex-col gap-[var(--space-1)]">
                  <label htmlFor={`${id}-file`} className="font-medium">
                    {a("imageFile", locale)}
                  </label>
                  <span className="text-sm text-ink-600">{a("imageFileHint", locale, { mb: ADMIN_UPLOAD_MAX_BYTES / 1024 / 1024 })}</span>
                  <input id={`${id}-file`} type="file" accept="image/jpeg,image/png,image/webp,image/heic" data-upload="file" />
                </div>
                <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                  <label className="flex flex-col gap-[var(--space-1)] font-medium">
                    {a("imageAltTh", locale)}
                    <input type="text" lang="th" data-upload="altTh" className="min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] font-normal" />
                  </label>
                  <label className="flex flex-col gap-[var(--space-1)] font-medium">
                    {a("imageAltEn", locale)}
                    <input type="text" lang="en" data-upload="altEn" className="min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] font-normal" />
                  </label>
                </div>
                <label className="flex items-center gap-[var(--space-2)]">
                  <input type="checkbox" data-upload="isDecorative" className="size-5" />
                  {a("imageDecorativeLabel", locale)}
                </label>
                {uploadError ? <ErrorMessage id={`${id}-upload-error`}>{uploadError}</ErrorMessage> : null}
                <div>
                  <Button
                    type="button"
                    loading={uploading}
                    loadingLabel={a("imageUploading", locale)}
                    onClick={(e) => upload(e.currentTarget.closest("[data-upload-form]") as HTMLElement)}
                  >
                    {a("imageUpload", locale)}
                  </Button>
                </div>
              </div>
            ) : (
              <NotificationBanner variant="info" title={a("storageNotConfiguredTitle", locale)}>
                {a("errStorageNotConfigured", locale)}
              </NotificationBanner>
            )}
          </section>
        </div>
      </PortalDialog>
    </div>
  );
}
