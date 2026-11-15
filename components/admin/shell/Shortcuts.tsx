"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { GO_TIMEOUT_MS, type GoShortcut } from "@/lib/admin/shortcuts";
import { chordOutcome, chordReducer, IDLE_CHORD, type ChordEvent, type ChordState } from "./chord-machine";
import type { ShellLabels } from "./labels";

type Labels = Pick<
  ShellLabels,
  "shortcutsTitle" | "shortcutsIntro" | "shortcutsGeneral" | "shortcutsGoTo" | "shortcutsThen" | "shortcutsOpenPalette" | "shortcutsOpenHelp" | "shortcutsClose" | "shortcutsPending"
>;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest('[contenteditable="true"], [role="textbox"], [role="combobox"], [role="listbox"]') !== null;
}

function dialogOpen(): boolean {
  return document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]') !== null;
}

/**
 * "g" then a letter goes to a page; "?" opens the list. Ignored while typing
 * in a field or the rich text editor, with a modifier held, or while a dialog
 * is open. Never the only way to reach a page: the menu has every one.
 */
export function ShortcutKeys({ shortcuts, labels, onHelp, helpOpen }: { shortcuts: GoShortcut[]; labels: Pick<Labels, "shortcutsPending">; onHelp: () => void; helpOpen: boolean }) {
  const router = useRouter();
  const [chord, setChord] = useState<ChordState>(IDLE_CHORD);
  const chordRef = useRef<ChordState>(IDLE_CHORD);
  const pending = chord.status === "awaiting";
  const since = chord.status === "awaiting" ? chord.since : null;

  useEffect(() => {
    function apply(event: ChordEvent) {
      const next = chordReducer(chordRef.current, event);
      chordRef.current = next;
      setChord(next);
    }
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || helpOpen || dialogOpen()) return;
      const outcome = chordOutcome(chordRef.current, event.key, shortcuts);
      apply({ type: "key", key: event.key, now: Date.now(), canStart: shortcuts.length > 0 });
      if (outcome.kind === "go") {
        event.preventDefault();
        router.push(outcome.href);
      } else if (outcome.kind === "help") {
        event.preventDefault();
        onHelp();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      apply({ type: "reset" });
    };
  }, [shortcuts, router, onHelp, helpOpen]);

  useEffect(() => {
    if (since === null) return;
    const timer = window.setTimeout(() => {
      const next = chordReducer(chordRef.current, { type: "timeout", since });
      chordRef.current = next;
      setChord(next);
    }, GO_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [since]);

  return (
    <p role="status" className={pending ? "fixed bottom-[var(--space-4)] left-[var(--space-4)] z-50 m-0 rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-sm text-ink-900" : "visually-hidden"}>
      {pending ? labels.shortcutsPending : ""}
    </p>
  );
}

function Keys({ keys, then }: { keys: string[]; then: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-[var(--space-1)]">
      {keys.map((key, i) => (
        <span key={`${key}-${i}`} className="inline-flex items-center gap-[var(--space-1)]">
          {i > 0 ? <span className="text-sm text-ink-600">{then}</span> : null}
          <kbd className="console-kbd !m-0">{key}</kbd>
        </span>
      ))}
    </span>
  );
}

/** The list of shortcuts in a modal dialog. A native `dialog`, so focus is trapped, Escape closes it and focus returns to what opened it. */
export function ShortcutsDialog({ open, onClose, shortcuts, labels, apple }: { open: boolean; onClose: () => void; shortcuts: GoShortcut[]; labels: Labels; apple: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const general = [
    { keys: [apple ? "⌘ K" : "Ctrl K"], label: labels.shortcutsOpenPalette },
    { keys: ["/"], label: labels.shortcutsOpenPalette },
    { keys: ["?"], label: labels.shortcutsOpenHelp },
  ];

  return (
    <dialog
      ref={ref}
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-auto rounded-panel border border-line-strong bg-surface p-[var(--space-5)] text-ink-900 backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <h2 id="shortcuts-title" className="m-0 text-lg font-semibold">
          {labels.shortcutsTitle}
        </h2>
        <button type="button" onClick={onClose} className="console-icon-button" aria-label={labels.shortcutsClose} title={labels.shortcutsClose}>
          <ConsoleIcon name="close" />
        </button>
      </div>
      <p className="mt-[var(--space-2)] text-ink-600">{labels.shortcutsIntro}</p>
      <h3 className="mb-[var(--space-2)] mt-[var(--space-4)] text-base font-semibold">{labels.shortcutsGeneral}</h3>
      <dl className="m-0 grid grid-cols-[1fr_auto] items-center gap-x-[var(--space-4)] gap-y-[var(--space-2)]">
        {general.map((row) => (
          <div key={row.keys.join()} className="contents">
            <dt>{row.label}</dt>
            <dd className="m-0 text-end">
              <Keys keys={row.keys} then={labels.shortcutsThen} />
            </dd>
          </div>
        ))}
      </dl>
      {shortcuts.length > 0 ? (
        <>
          <h3 className="mb-[var(--space-2)] mt-[var(--space-4)] text-base font-semibold">{labels.shortcutsGoTo}</h3>
          <dl className="m-0 grid grid-cols-[1fr_auto] items-center gap-x-[var(--space-4)] gap-y-[var(--space-2)]">
            {shortcuts.map((s) => (
              <div key={s.key} className="contents">
                <dt className="inline-flex items-center gap-[var(--space-2)]">
                  <ConsoleIcon name={s.icon} className="text-ink-600" />
                  {s.label}
                </dt>
                <dd className="m-0 text-end">
                  <Keys keys={["g", s.key]} then={labels.shortcutsThen} />
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </dialog>
  );
}
