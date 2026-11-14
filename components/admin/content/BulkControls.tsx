"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

const CHECKBOX = "h-[1.25rem] w-[1.25rem] shrink-0 accent-[var(--colour-action)]";

function formOf(element: HTMLElement | null): HTMLFormElement | null {
  return element?.closest("form") ?? null;
}

const rowBoxes = (form: HTMLFormElement) => Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="id"]'));

/** "Select all on this page". Needs JavaScript, so it stays hidden until the page has loaded; each row's own checkbox works without it. */
export function SelectAllCheckbox({ locale }: { locale: Locale }) {
  const id = useId();
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [state, setState] = useState<"none" | "some" | "all">("none");
  const box = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const form = formOf(box.current);
    if (!form) return;
    const sync = () => {
      const boxes = rowBoxes(form);
      const checked = boxes.filter((b) => b.checked).length;
      setState(checked === 0 ? "none" : checked === boxes.length ? "all" : "some");
    };
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, [ready]);
  useEffect(() => {
    if (box.current) box.current.indeterminate = state === "some";
  }, [ready, state]);

  if (!ready) return null;
  return (
    <label htmlFor={id} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
      <input
        id={id}
        ref={box}
        type="checkbox"
        className={CHECKBOX}
        checked={state === "all"}
        onChange={(event) => {
          const form = formOf(event.currentTarget);
          if (!form) return;
          for (const box of rowBoxes(form)) box.checked = event.currentTarget.checked;
          setState(event.currentTarget.checked ? "all" : "none");
          form.dispatchEvent(new Event("change", { bubbles: true }));
        }}
      />
      <span>{a("clSelectAll", locale)}</span>
    </label>
  );
}

/**
 * The bulk action bar, pinned to the bottom of the screen. The buttons are
 * plain form submits with an `intent`, so they work without JavaScript; with it
 * the bar also announces how many rows are selected and disables the buttons
 * until one is.
 */
export function BulkBar({ locale, canChangeStatus }: { locale: Locale; canChangeStatus: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const form = formOf(node);
    if (!form) return;
    const sync = () => setCount(rowBoxes(form).filter((b) => b.checked).length);
    sync();
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, [node]);

  const disabled = count === 0;
  return (
    <div ref={setNode} role="group" aria-label={a("clBulkActions", locale)} className="console-actionbar">
      <p role="status" aria-live="polite" className="m-0 min-w-0 flex-1 text-sm text-ink-600">
        {count === null ? a("clBulkActions", locale) : a("clSelectedCount", locale, { count })}
      </p>
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        {canChangeStatus ? (
          <>
            <Button type="submit" name="intent" value="publish" variant="secondary" icon={<ConsoleIcon name="publish" />} disabled={disabled}>
              {a("clBulkPublish", locale)}
            </Button>
            <Button type="submit" name="intent" value="unpublish" variant="secondary" icon={<ConsoleIcon name="draft" />} disabled={disabled}>
              {a("clBulkUnpublish", locale)}
            </Button>
          </>
        ) : null}
        <Button type="submit" name="intent" value="delete" variant="destructive" icon={<ConsoleIcon name="delete" />} disabled={disabled}>
          {a("clBulkDelete", locale)}
        </Button>
      </div>
    </div>
  );
}
