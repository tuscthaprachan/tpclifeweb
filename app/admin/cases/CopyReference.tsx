"use client";

import { Check, Copy } from "lucide-react";
import { useCopy } from "@/components/hooks/use-copy";
import { Glyph } from "./SectionCard";

/** Copies a case reference to the clipboard; the reference stays readable as text when scripting is off. `failedLabel` is what is announced when the clipboard refuses. */
export function CopyReference({ reference, copyLabel, copiedLabel, failedLabel }: { reference: string; copyLabel: string; copiedLabel: string; failedLabel?: string }) {
  const { value, nonce, copy } = useCopy();
  const copied = value === "copied";
  return (
    <div className="flex flex-wrap items-center gap-[var(--space-2)]">
      <code className="rounded-control border border-line px-[var(--space-2)] py-[var(--space-1)] text-base text-ink-900">{reference}</code>
      <button type="button" onClick={() => void copy(reference)} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] rounded-control px-[var(--space-2)] text-action underline">
        <Glyph icon={copied ? Check : Copy} size={16} />
        <span>{copyLabel}</span>
      </button>
      <span role="status" className="text-sm text-ink-600">
        <span key={nonce}>{copied ? copiedLabel : value === "failed" ? (failedLabel ?? "") : ""}</span>
      </span>
    </div>
  );
}
