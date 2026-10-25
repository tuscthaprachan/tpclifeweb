"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * A one-time link in a read-only box with a copy button. The box works without
 * JavaScript (select and copy by hand); the button is the shortcut. The result
 * is announced politely for screen readers.
 */
export function CopyLink({ locale, id, link }: { locale: Locale; id: string; link: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    input.current?.select();
    try {
      await navigator.clipboard.writeText(link);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <label htmlFor={id} className="text-base font-medium text-ink-900">
        {a("linkLabel", locale)}
      </label>
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        <input
          ref={input}
          id={id}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-[var(--target-min)] min-w-0 flex-1 basis-[16rem] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] font-mono text-sm text-ink-900"
        />
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {a("copyLink", locale)}
        </Button>
      </div>
      <p className="m-0 text-sm text-ink-600" role="status" aria-live="polite">
        {status === "copied" ? a("linkCopied", locale) : status === "failed" ? a("linkCopyFailed", locale) : ""}
      </p>
    </div>
  );
}
