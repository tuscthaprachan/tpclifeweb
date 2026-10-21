"use client";

import { useRef, useState, useTransition, type ChangeEvent, type FocusEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { liveRegionProps } from "@/lib/a11y";
import { serialise } from "@/lib/canteen/params";
import { formQuery, readFilters } from "./query";

interface FilterFormProps {
  /** Where the form goes, with the locale prefix, for example "/en/eat/dishes". */
  action: string;
  /** Parameters this form does not own but must keep, for example `seed`. Sent as hidden fields so the no JavaScript submit keeps them too. */
  carry?: Record<string, string>;
  /** `serialise(filters)` of the filters the server rendered the fields with. Used to tell "the server caught up with what I did" from "the URL changed some other way". */
  queryKey: string;
  /** The submit button's text, for example "Show 23 dishes". */
  submitLabel: string;
  /** "sticky" pins the submit button and the clear link to the bottom of the dialog's scroll area. "flow" leaves them at the end of the form. */
  footer?: "sticky" | "flow";
  /** Shown left of the submit button in the sticky footer, for example a "Clear all" link. */
  clear?: ReactNode;
  /** The server rendered fields. Passed through as children so they stay server components. */
  children: ReactNode;
}

/** How long to wait after the last keystroke in the budget box before applying. */
const TYPING_DELAY_MS = 450;

/** How long to wait after a radio or select changed by keyboard, so arrowing through the options applies once (3.2.2 On Input). */
const KEYBOARD_DELAY_MS = 600;

/**
 * The wrapper of the filter form. The base is a real `<form method="get">`
 * with a submit button, so it works with JavaScript off: the browser sends the
 * checked fields to `action` and the server filters. JavaScript only makes it
 * instant: every change builds the same URL the plain submit would, and
 * `router.replace`s to it, so the page updates without a reload and the Back
 * button does not fill with every tick of a checkbox.
 *
 * The fields are uncontrolled. When the URL changes from somewhere else (a
 * chip's remove link, Back), the fields are remounted so they show the new
 * state. When the change came from this form, they are left alone so focus
 * stays where the keyboard user put it.
 *
 * Checkboxes and pointer choices apply at once. Arrowing through radios or a
 * select waits until the keyboard user stops or leaves the group, so each
 * step does not change the page (3.2.2 On Input).
 */
export function FilterForm({ action, carry = {}, queryKey, submitLabel, footer = "flow", clear, children }: FilterFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointer = useRef(false);

  const [seen, setSeen] = useState(queryKey);
  const [shown, setShown] = useState(queryKey);
  const [generation, setGeneration] = useState(0);
  if (queryKey !== seen) {
    setSeen(queryKey);
    if (queryKey !== shown) {
      setShown(queryKey);
      setGeneration((value) => value + 1);
    }
  }

  function apply(form: HTMLFormElement) {
    const entries = new URLSearchParams();
    for (const [name, value] of new FormData(form)) {
      if (typeof value === "string") entries.append(name, value);
    }
    if (entries.get("max") !== "other") entries.delete("maxOther");
    const query = formQuery(entries, carry);
    setShown(serialise(readFilters(entries)));
    startTransition(() => {
      router.replace(query ? `${action}?${query}` : action, { scroll: false });
    });
  }

  function schedule(form: HTMLFormElement, delay: number) {
    window.clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      apply(form);
    }, delay);
  }

  function cancel() {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  }

  function onChange(event: ChangeEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const target = event.target;
    if (target instanceof HTMLInputElement && target.type === "text") {
      schedule(form, TYPING_DELAY_MS);
    } else if (!pointer.current && ((target instanceof HTMLInputElement && target.type === "radio") || target instanceof HTMLSelectElement)) {
      schedule(form, KEYBOARD_DELAY_MS);
    } else {
      cancel();
      apply(form);
    }
  }

  function onBlur(event: FocusEvent<HTMLFormElement>) {
    if (timer.current === undefined) return;
    const from = event.target;
    const to = event.relatedTarget;
    if (from instanceof HTMLInputElement && from.type === "radio" && to instanceof HTMLInputElement && to.type === "radio" && to.name === from.name) return;
    cancel();
    apply(event.currentTarget);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cancel();
    apply(event.currentTarget);
  }

  const sticky = footer === "sticky";

  return (
    <form
      method="get"
      action={action}
      onChange={onChange}
      onBlur={onBlur}
      onSubmit={onSubmit}
      onPointerDownCapture={() => {
        pointer.current = true;
      }}
      onKeyDownCapture={() => {
        pointer.current = false;
      }}
      aria-busy={pending || undefined}
    >
      {Object.entries(carry).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div key={generation} className="flex flex-col gap-[var(--space-6)]">
        {children}
      </div>
      <div
        className={
          sticky
            ? "sticky bottom-0 z-[1] -mx-[var(--space-4)] -mb-[var(--space-4)] mt-[var(--space-6)] flex flex-wrap items-center justify-between gap-x-[var(--space-3)] gap-y-[var(--space-2)] border-t border-line bg-surface px-[var(--space-4)] pt-[var(--space-3)] pb-[max(var(--space-3),env(safe-area-inset-bottom))]"
            : "mt-[var(--space-6)]"
        }
      >
        {sticky ? clear : null}
        <Button type="submit" className={sticky ? "min-w-[10rem] flex-1" : "w-full sm:w-auto"}>
          {submitLabel}
        </Button>
      </div>
      {sticky ? (
        <p {...liveRegionProps("polite")} className="visually-hidden">
          {submitLabel}
        </p>
      ) : null}
    </form>
  );
}
