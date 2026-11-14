"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { uploadImageAction } from "@/app/admin/content/actions";
import { compressInBrowser } from "@/components/admin/content/compress-image-browser";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

type Status = "queued" | "compressing" | "uploading" | "done" | "failed";

interface Item {
  key: number;
  file: File;
  altTh: string;
  altEn: string;
  decorative: boolean;
  status: Status;
  error?: string;
  imageId?: string;
}

const STATUS_KEY = {
  queued: "mlStatusQueued",
  compressing: "mlStatusCompressing",
  uploading: "mlStatusUploading",
  done: "mlStatusDone",
  failed: "mlStatusFailed",
} as const satisfies Record<Status, string>;

const PROGRESS: Record<Status, number> = { queued: 0, compressing: 30, uploading: 65, done: 100, failed: 100 };

const isPicture = (file: File) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(file.name);

const subscribe = () => () => {};

/**
 * Drag and drop upload for the library page. It only appears once the page has
 * loaded; without JavaScript the "Upload a picture" button opens the plain
 * upload form. Each file is compressed in the browser and sent through the
 * shared `uploadImageAction`, one at a time, with its own progress and description.
 */
export function LibraryUpload({ locale }: { locale: Locale }) {
  const router = useRouter();
  const inputId = useId();
  const nextKey = useRef(0);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  if (!ready) return null;

  const patch = (key: number, change: Partial<Item>) => setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));

  function add(files: FileList | File[]) {
    const skipped: string[] = [];
    const accepted: Item[] = [];
    for (const file of Array.from(files)) {
      if (!isPicture(file)) {
        skipped.push(a("mlQueueSkipped", locale, { name: file.name }));
        continue;
      }
      accepted.push({ key: nextKey.current++, file, altTh: "", altEn: "", decorative: false, status: "queued" });
    }
    setNotes(skipped);
    setSummary(null);
    setItems((list) => [...list.filter((i) => i.status !== "done"), ...accepted]);
  }

  async function uploadAll() {
    setRunning(true);
    setSummary(null);
    const queue = items.filter((i) => i.status !== "done");
    let ok = 0;
    let failed = 0;
    for (const item of queue) {
      if (!item.decorative && (!item.altTh.trim() || !item.altEn.trim())) {
        patch(item.key, { status: "failed", error: a("mlQueueAltNeeded", locale) });
        failed++;
        continue;
      }
      patch(item.key, { status: "compressing", error: undefined });
      const compressed = await compressInBrowser(item.file);
      if (compressed.status === "failed") {
        patch(item.key, { status: "failed", error: a(compressed.reason === "decode" ? "errUploadCompressDecode" : "errUploadCompressStill", locale) });
        failed++;
        continue;
      }
      patch(item.key, { status: "uploading" });
      const data = new FormData();
      data.set("file", compressed.file);
      data.set("altTh", item.altTh);
      data.set("altEn", item.altEn);
      if (item.decorative) data.set("isDecorative", "on");
      try {
        const result = await uploadImageAction(data);
        if (result.ok) {
          patch(item.key, { status: "done", imageId: result.image.id });
          ok++;
        } else {
          patch(item.key, { status: "failed", error: result.error });
          failed++;
        }
      } catch {
        patch(item.key, { status: "failed", error: a("errUploadFailed", locale) });
        failed++;
      }
    }
    setRunning(false);
    setSummary(failed ? a("mlQueueSomeFailed", locale, { failed }) : a("mlQueueAllDone", locale, { ok }));
    if (ok) router.refresh();
  }

  const waiting = items.filter((i) => i.status !== "done").length;

  return (
    <section aria-labelledby={`${inputId}-title`} className="console-card flex flex-col gap-[var(--space-3)] p-[var(--space-4)]">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!running) add(e.dataTransfer.files);
        }}
        className={`flex flex-col items-start gap-[var(--space-2)] rounded-control border-2 border-dashed p-[var(--space-4)] ${over ? "border-ink-900 bg-surface-alt" : "border-line-strong"}`}
      >
        <h2 id={`${inputId}-title`} className="m-0 flex items-center gap-[var(--space-2)] text-lg font-semibold">
          <ConsoleIcon name="upload" />
          {a("mlDropTitle", locale)}
        </h2>
        <p className="m-0 text-ink-600">{over ? a("mlDropActive", locale) : a("mlDropHint", locale)}</p>
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="visually-hidden"
          disabled={running}
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
        <label htmlFor={inputId} className="inline-flex min-h-[var(--target-min)] cursor-pointer items-center gap-[var(--space-2)] rounded-control border border-line-strong bg-surface px-[var(--space-4)] font-medium focus-within:outline">
          {a("mlDropChoose", locale)}
        </label>
      </div>

      {notes.length ? (
        <ul role="status" className="m-0 list-none p-0 text-sm text-ink-600">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      {items.length ? (
        <>
          <h3 className="m-0 text-base font-semibold">{a("mlQueueTitle", locale)}</h3>
          <ul className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
            {items.map((item) => {
              const locked = running || item.status === "done";
              const progressId = `${inputId}-p-${item.key}`;
              return (
                <li key={item.key} className="flex flex-col gap-[var(--space-2)] border-t border-line pt-[var(--space-3)]">
                  <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
                    <span className="min-w-0 break-all font-medium">{item.file.name}</span>
                    <span className="flex items-center gap-[var(--space-2)] text-sm">
                      <span id={progressId}>{a(STATUS_KEY[item.status], locale)}</span>
                      {!locked ? (
                        <button type="button" className="inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center" onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}>
                          <ConsoleIcon name="close" size={16} />
                          <span className="visually-hidden">{a("mlQueueRemove", locale, { name: item.file.name })}</span>
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <progress max={100} value={PROGRESS[item.status]} aria-label={a("mlProgressLabel", locale, { name: item.file.name })} aria-describedby={progressId} className="h-2 w-full" />
                  {item.status === "done" ? null : (
                    <>
                      <div className="grid gap-[var(--space-3)] md:grid-cols-2">
                        <TextInput id={`${inputId}-th-${item.key}`} lang="th" label={a("imageAltTh", locale)} autoComplete="off" disabled={locked || item.decorative} value={item.altTh} onChange={(e) => patch(item.key, { altTh: e.target.value })} />
                        <TextInput id={`${inputId}-en-${item.key}`} lang="en" label={a("imageAltEn", locale)} autoComplete="off" disabled={locked || item.decorative} value={item.altEn} onChange={(e) => patch(item.key, { altEn: e.target.value })} />
                      </div>
                      <label className="flex items-center gap-[var(--space-2)]">
                        <input type="checkbox" className="size-5" disabled={locked} checked={item.decorative} onChange={(e) => patch(item.key, { decorative: e.target.checked })} />
                        {a("imageDecorativeLabel", locale)}
                      </label>
                    </>
                  )}
                  {item.error ? (
                    <p role="alert" className="m-0 text-sm font-medium text-error">
                      {item.error}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div>
            <Button type="button" onClick={uploadAll} disabled={running || waiting === 0} loading={running} loadingLabel={a("imageUploading", locale)} icon={<ConsoleIcon name="upload" />}>
              {a("mlQueueUpload", locale, { count: waiting })}
            </Button>
          </div>
        </>
      ) : null}
      {summary ? (
        <p role="status" className="m-0 font-medium">
          {summary}
        </p>
      ) : null}
    </section>
  );
}
