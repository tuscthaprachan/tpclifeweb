"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { uploadImageAction } from "@/app/admin/content/actions";
import { runUpload } from "@/components/admin/content/upload/run-upload";
import { initialUpload, isUploadBusy, uploadError, uploadProgress, uploadReducer, type UploadEvent, type UploadState } from "@/components/admin/content/upload/upload-machine";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, TextInput } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

interface Item {
  key: number;
  file: File;
  altTh: string;
  altEn: string;
  decorative: boolean;
  upload: UploadState<string>;
}

const STATUS_KEY = {
  idle: "mlStatusQueued",
  queued: "mlStatusQueued",
  compressing: "mlStatusCompressing",
  uploading: "mlStatusUploading",
  done: "mlStatusDone",
  failed: "mlStatusFailed",
} as const satisfies Record<UploadState["status"], string>;

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
  const nextRun = useRef(0);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
    const [notes, setNotes] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  if (!ready) return null;

  const running = items.some((item) => isUploadBusy(item.upload));
  const patch = (key: number, change: Partial<Item>) => setItems((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));
  const send = (key: number, event: UploadEvent<string>) => setItems((list) => list.map((item) => (item.key === key ? { ...item, upload: uploadReducer(item.upload, event) } : item)));

  function add(files: FileList | File[]) {
    const skipped: string[] = [];
    const accepted: Item[] = [];
    for (const file of Array.from(files)) {
      if (!isPicture(file)) {
        skipped.push(a("mlQueueSkipped", locale, { name: file.name }));
        continue;
      }
      accepted.push({ key: nextKey.current++, file, altTh: "", altEn: "", decorative: false, upload: initialUpload<string>() });
    }
    setNotes(skipped);
    setSummary(null);
    setItems((list) => [...list.filter((i) => i.upload.status !== "done"), ...accepted]);
  }

  async function uploadAll() {
    if (running) return;
    setSummary(null);
    const queue = items.filter((i) => i.upload.status !== "done");
    const runs = new Map(queue.map((item, index) => [item.key, nextRun.current + index + 1]));
    nextRun.current += queue.length;
    for (const item of queue) send(item.key, { type: "queue", run: runs.get(item.key)! });
    let ok = 0;
    let failed = 0;
    for (const item of queue) {
      const run = runs.get(item.key)!;
      if (!item.decorative && (!item.altTh.trim() || !item.altEn.trim())) {
        send(item.key, { type: "fail", run, reason: "invalid", message: a("mlQueueAltNeeded", locale) });
        failed++;
        continue;
      }
      const outcome = await runUpload<string>({
        run,
        file: item.file,
        locale,
        emit: (event) => send(item.key, event),
        isCurrent: () => true,
        upload: async (sent) => {
          const data = new FormData();
          if (sent) data.set("file", sent);
          data.set("altTh", item.altTh);
          data.set("altEn", item.altEn);
          if (item.decorative) data.set("isDecorative", "on");
          const result = await uploadImageAction(data);
          return result.ok ? { ok: true, result: result.image.id } : { ok: false, error: result.error };
        },
      });
      if (outcome.status === "done") ok++;
      else failed++;
    }
    setSummary(failed ? a("mlQueueSomeFailed", locale, { failed }) : a("mlQueueAllDone", locale, { ok }));
    if (ok) router.refresh();
  }

  const waiting = items.filter((i) => i.upload.status !== "done").length;

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
              const status = item.upload.status;
              const error = uploadError(item.upload);
              const locked = running || status === "done";
              const progressId = `${inputId}-p-${item.key}`;
              return (
                <li key={item.key} className="flex flex-col gap-[var(--space-2)] border-t border-line pt-[var(--space-3)]">
                  <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)]">
                    <span className="min-w-0 break-all font-medium">{item.file.name}</span>
                    <span className="flex items-center gap-[var(--space-2)] text-sm">
                      <span id={progressId}>{a(STATUS_KEY[status], locale)}</span>
                      {!locked ? (
                        <button type="button" className="inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center" onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}>
                          <ConsoleIcon name="close" size={16} />
                          <span className="visually-hidden">{a("mlQueueRemove", locale, { name: item.file.name })}</span>
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <progress max={100} value={uploadProgress(item.upload)} aria-label={a("mlProgressLabel", locale, { name: item.file.name })} aria-describedby={progressId} className="h-2 w-full" />
                  {status === "done" ? null : (
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
                  {error ? (
                    <p role="alert" className="m-0 text-sm font-medium text-error">
                      {error}
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
