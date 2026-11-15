"use client";

import { useCopy } from "@/components/hooks/use-copy";
import { useHydrated } from "@/components/hooks/use-hydrated";
import { ConsoleIcon } from "@/components/admin/icons";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/** Copies a picture's link. Hidden until the page has loaded, since without JavaScript the link is shown as text to select. */
export function CopyUrlButton({ url, locale }: { url: string; locale: Locale }) {
  const ready = useHydrated();
  const { value, nonce, copy } = useCopy();
  if (!ready) return null;
  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] font-medium"
        onClick={() => void copy(url)}
      >
        <ConsoleIcon name="copy" size={16} />
        {a("mlCopyUrl", locale)}
      </button>
      <span role="status" className="text-sm text-ink-600">
        <span key={nonce}>{value === "copied" ? a("mlCopied", locale) : value === "failed" ? a("mlCopyFailed", locale) : ""}</span>
      </span>
    </>
  );
}
