"use client";

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
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
  /** The server rendered fields. Passed through as children so they stay server components. */
  children: ReactNode;
}

/** How long to wait after the last keystroke in the budget box before applying. */
const TYPING_DELAY_MS = 450;

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
 */
export function FilterForm({ action, carry = {}, queryKey, submitLabel, children }: FilterFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    const query = formQuery(entries, carry);
    setShown(serialise(readFilters(entries)));
    startTransition(() => {
      router.replace(query ? `${action}?${query}` : action, { scroll: false });
    });
  }

  function onChange(event: ChangeEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const target = event.target;
    window.clearTimeout(timer.current);
    if (target instanceof HTMLInputElement && (target.type === "number" || target.type === "text")) {
      timer.current = setTimeout(() => apply(form), TYPING_DELAY_MS);
    } else {
      apply(form);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.clearTimeout(timer.current);
    apply(event.currentTarget);
  }

  return (
    <form method="get" action={action} onChange={onChange} onSubmit={onSubmit} aria-busy={pending || undefined}>
      {Object.entries(carry).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div key={generation} className="flex flex-col gap-[var(--space-6)]">
        {children}
      </div>
      <div className="mt-[var(--space-6)]">
        <Button type="submit" className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
