"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Glyph } from "./SectionCard";

/** Copies a case reference to the clipboard; the button stays a readable code when scripting is off. */
export function CopyReference({ reference, copyLabel, copiedLabel }: { reference: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-[var(--space-2)]">
      <code className="rounded-control border border-line px-[var(--space-2)] py-[var(--space-1)] text-base text-ink-900">{reference}</code>
      <button type="button" onClick={copy} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] rounded-control px-[var(--space-2)] text-action underline">
        <Glyph icon={copied ? Check : Copy} size={16} />
        <span>{copyLabel}</span>
      </button>
      <span role="status" className="text-sm text-ink-600">
        {copied ? copiedLabel : ""}
      </span>
    </div>
  );
}
