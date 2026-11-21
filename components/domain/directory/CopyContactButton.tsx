"use client";

import { useRef, useState } from "react";
import { useHydrated } from "@/components/hooks/use-hydrated";
import type { Locale } from "@/lib/i18n/config";
import { editableStrings } from "@/lib/i18n/editable";

const COPY_TEXT = editableStrings(
  "domain-directory-copy",
  {
    copy: { th: "คัดลอก", en: "Copy" },
    copied: { th: "คัดลอกแล้ว", en: "Copied" },
    copyLabel: { th: "คัดลอกไอดี LINE", en: "Copy LINE ID" },
  },
  { th: "ไดเรกทอรี: คัดลอกการติดต่อ", en: "Directory: copy contact" },
);

export function CopyContactButton({ value, locale }: { value: string; locale: Locale }) {
  const hydrated = useHydrated();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  if (!hydrated) return null;

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`${COPY_TEXT.copyLabel[locale]}: ${value}`}
        className="inline-flex min-h-[var(--target-min)] items-center rounded-control border border-line-strong bg-surface px-[var(--space-2)] text-sm font-medium text-action hover:bg-surface-alt"
      >
        {COPY_TEXT.copy[locale]}
      </button>
      <span role="status" aria-live="polite" className="text-sm text-ink-600">
        {copied ? COPY_TEXT.copied[locale] : ""}
      </span>
    </>
  );
}
