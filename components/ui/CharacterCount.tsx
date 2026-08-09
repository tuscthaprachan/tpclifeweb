"use client";

import { useEffect, useState, type ReactNode } from "react";
import { liveRegionProps } from "@/lib/a11y";
import { Textarea } from "./Textarea";

interface CharacterCountProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  maxLength: number;
  /**
   * Template for the remaining-characters sentence, with `{count}` where the
   * number goes, e.g. "You have {count} characters left" / "เหลือ {count} ตัวอักษร".
   * A plain string rather than a function: CharacterCount is a Client
   * Component (it needs live state), and a function prop cannot cross from a
   * Server Component parent, which is how most pages on this site are
   * written by default. Not in lib/i18n/strings.ts, so the caller supplies it.
   */
  remainingLabel: string;
  /** Overrides remainingLabel for exactly one character left, for a language with a singular form. English needs this ("1 character", not "1 characters"); Thai does not, so leave it unset there. */
  remainingLabelOne?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  rows?: number;
  className?: string;
}

function formatRemaining(remaining: number, template: string, templateOne: string | undefined): string {
  const chosen = remaining === 1 && templateOne ? templateOne : template;
  return chosen.replace("{count}", String(remaining));
}

/**
 * A textarea with a live remaining-character count. The visible count
 * updates on every keystroke; the version announced to assistive tech is
 * debounced by 500ms so a fast typist is not interrupted mid-sentence by a
 * screen reader reading out every single change (4.1.3 covers announcing
 * status, not announcing it as often as possible).
 */
export function CharacterCount({
  id,
  label,
  hint,
  error,
  maxLength,
  remainingLabel,
  remainingLabelOne,
  value,
  defaultValue = "",
  onValueChange,
  rows,
  className,
}: CharacterCountProps) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const [announcedLength, setAnnouncedLength] = useState(current.length);

  useEffect(() => {
    const timer = setTimeout(() => setAnnouncedLength(current.length), 500);
    return () => clearTimeout(timer);
  }, [current]);

  const countHintId = `${id}-remaining`;

  return (
    <div className={className}>
      <Textarea
        id={id}
        label={label}
        hint={hint}
        error={error}
        rows={rows}
        maxLength={maxLength}
        extraDescribedBy={countHintId}
        value={current}
        onChange={(event) => {
          const next = event.target.value;
          setInternal(next);
          onValueChange?.(next);
        }}
      />
      <p id={countHintId} aria-hidden="true" className="mt-[var(--space-1)] text-sm text-ink-600">
        {formatRemaining(maxLength - current.length, remainingLabel, remainingLabelOne)}
      </p>
      <p {...liveRegionProps("polite")} className="visually-hidden">
        {formatRemaining(maxLength - announcedLength, remainingLabel, remainingLabelOne)}
      </p>
    </div>
  );
}
