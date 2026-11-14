"use client";

import { useState, useSyncExternalStore } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

const subscribe = () => () => {};

/** Copies a picture's link. Hidden until the page has loaded, since without JavaScript the link is shown as text to select. */
export function CopyUrlButton({ url, locale }: { url: string; locale: Locale }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [message, setMessage] = useState("");
  if (!ready) return null;
  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] font-medium"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage(a("mlCopied", locale));
          } catch {
            setMessage(a("mlCopyFailed", locale));
          }
        }}
      >
        <ConsoleIcon name="copy" size={16} />
        {a("mlCopyUrl", locale)}
      </button>
      <span role="status" className="text-sm text-ink-600">
        {message}
      </span>
    </>
  );
}
