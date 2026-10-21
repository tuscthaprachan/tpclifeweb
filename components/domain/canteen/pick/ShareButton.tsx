"use client";

import { useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/Button";
import type { Locale } from "@/lib/i18n/config";
import { PICK } from "./strings";

interface ShareButtonProps {
  locale: Locale;
  /** The path and query of this exact pick, for example `/en/eat/pick?seed=k7m2qx`. */
  href: string;
  /** Unique on the page. */
  id: string;
}

const subscribeNever = () => () => {};

/**
 * Share this pick. The seed is in the URL, so the link reopens the same
 * result. Without JavaScript (and whenever copying fails) the link sits in a
 * read-only text box to copy by hand. With JavaScript a button copies it and
 * says so in a status line.
 */
export function ShareButton({ locale, href, id }: ShareButtonProps) {
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const input = useRef<HTMLInputElement>(null);

  const url = hydrated ? new URL(href, window.location.origin).toString() : href;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  const field = (
    <div className="flex flex-col gap-[var(--space-1)]">
      <label htmlFor={`${id}-url`} className="text-base font-medium text-ink-900">
        {PICK.shareManual[locale]}
      </label>
      <input
        ref={input}
        id={`${id}-url`}
        type="text"
        readOnly
        value={url}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-[var(--target-min)] w-full rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900"
      />
    </div>
  );

  if (!hydrated) {
    return (
      <details>
        <summary className="inline-flex min-h-[var(--target-min)] cursor-pointer items-center font-medium text-action underline">{PICK.share[locale]}</summary>
        <div className="mt-[var(--space-2)]">{field}</div>
      </details>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <div>
        <Button variant="secondary" onClick={copy}>
          {PICK.share[locale]}
        </Button>
      </div>
      <p role="status" className="m-0 text-base text-ink-900">
        {state === "copied" ? PICK.shareCopied[locale] : ""}
      </p>
      {state === "manual" ? field : null}
    </div>
  );
}
