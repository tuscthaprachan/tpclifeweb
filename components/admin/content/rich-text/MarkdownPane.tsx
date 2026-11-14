"use client";

import { useRef } from "react";
import { ErrorMessage } from "@/components/ui";

interface MarkdownPaneProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  lang: "th" | "en";
  labelledBy: string;
  describedBy?: string;
  error?: string | null;
  errorId: string;
  rows?: number;
}

/** A monospace editing box with a line number gutter. It does not wrap, so each number stays beside its line. */
export function MarkdownPane({ id, value, onChange, lang, labelledBy, describedBy, error, errorId, rows = 16 }: MarkdownPaneProps) {
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;
  return (
    <div>
      <div className="flex border-b border-line bg-surface">
        <div
          ref={gutter}
          aria-hidden="true"
          className="shrink-0 select-none overflow-hidden border-r border-line bg-surface-sunk px-[var(--space-2)] py-[var(--space-3)] text-right font-mono text-sm leading-6 text-ink-600"
          style={{ minWidth: `${String(lines).length + 2}ch` }}
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          id={id}
          value={value}
          lang={lang}
          rows={rows}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-labelledby={labelledBy}
          aria-describedby={[describedBy, error ? errorId : ""].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
          }}
          className="min-h-[14rem] min-w-0 flex-1 resize-y bg-surface px-[var(--space-3)] py-[var(--space-3)] font-mono text-sm leading-6 text-ink-900"
        />
      </div>
      {error ? (
        <div className="p-[var(--space-2)]">
          <ErrorMessage id={errorId}>{error}</ErrorMessage>
        </div>
      ) : null}
    </div>
  );
}
