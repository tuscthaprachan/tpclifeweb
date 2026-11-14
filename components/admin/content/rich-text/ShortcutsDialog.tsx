"use client";

import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { PortalDialog } from "../PortalDialog";

export const SHORTCUTS = {
  bold: "Mod-B",
  italic: "Mod-I",
  underline: "Mod-U",
  strike: "Mod-Shift-S",
  code: "Mod-E",
  link: "Mod-K",
  paragraph: "Mod-Alt-0",
  heading2: "Mod-Alt-2",
  heading3: "Mod-Alt-3",
  heading4: "Mod-Alt-4",
  bullets: "Mod-Shift-8",
  numbers: "Mod-Shift-7",
  quote: "Mod-Shift-B",
  codeBlock: "Mod-Alt-C",
  lineBreak: "Shift-Enter",
  undo: "Mod-Z",
  redo: "Mod-Shift-Z",
  find: "Mod-Shift-F",
  fullscreen: "Mod-Shift-Enter",
} as const;

export type ShortcutId = keyof typeof SHORTCUTS;

/** "Mod-Shift-8" as people say it: "Ctrl+Shift+8", or "Cmd+Shift+8" on a Mac. */
export function shortcutLabel(shortcut: string, mac: boolean): string {
  return shortcut
    .split("-")
    .map((k) => (k === "Mod" ? (mac ? "Cmd" : "Ctrl") : k === "Alt" && mac ? "Option" : k))
    .join("+");
}

const ROWS: Array<{ id: ShortcutId; label: AdminKey }> = [
  { id: "bold", label: "rteBold" },
  { id: "italic", label: "rteItalic" },
  { id: "underline", label: "edUnderline" },
  { id: "strike", label: "edStrike" },
  { id: "code", label: "edCode" },
  { id: "link", label: "rteLink" },
  { id: "paragraph", label: "rteParagraph" },
  { id: "heading2", label: "rteHeading" },
  { id: "heading3", label: "rteSubheading" },
  { id: "heading4", label: "rteSmallHeading" },
  { id: "bullets", label: "rteBullets" },
  { id: "numbers", label: "rteNumbers" },
  { id: "quote", label: "rteQuote" },
  { id: "codeBlock", label: "edCodeBlock" },
  { id: "lineBreak", label: "rteLineBreak" },
  { id: "undo", label: "rteUndo" },
  { id: "redo", label: "rteRedo" },
  { id: "find", label: "edFind" },
  { id: "fullscreen", label: "edFullscreen" },
];

export function ShortcutsDialog({ open, onClose, locale, mac }: { open: boolean; onClose: () => void; locale: Locale; mac: boolean }) {
  return (
    <PortalDialog open={open} onClose={onClose} title={a("edShortcutsTitle", locale)} headingLevel={2} locale={locale} className="w-[min(100vw-2rem,34rem)]">
      <p className="m-0 mb-[var(--space-3)] text-sm text-ink-600">{a("edShortcutsIntro", locale)}</p>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th scope="col" className="border-b border-line-strong py-[var(--space-1)] pr-[var(--space-3)] font-semibold">
              {a("edShortcutAction", locale)}
            </th>
            <th scope="col" className="border-b border-line-strong py-[var(--space-1)] font-semibold">
              {a("edShortcutKeys", locale)}
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="border-b border-line py-[var(--space-1)] pr-[var(--space-3)] font-normal">
                {a(row.label, locale)}
              </th>
              <td className="border-b border-line py-[var(--space-1)]">
                <kbd className="font-mono text-sm">{shortcutLabel(SHORTCUTS[row.id], mac)}</kbd>
              </td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="border-b border-line py-[var(--space-1)] pr-[var(--space-3)] font-normal">
              {a("edShortcutSlash", locale)}
            </th>
            <td className="border-b border-line py-[var(--space-1)]">{a("edShortcutSlashKeys", locale)}</td>
          </tr>
          <tr>
            <th scope="row" className="border-b border-line py-[var(--space-1)] pr-[var(--space-3)] font-normal">
              {a("edShortcutToolbar", locale)}
            </th>
            <td className="border-b border-line py-[var(--space-1)]">{a("edShortcutToolbarKeys", locale)}</td>
          </tr>
          <tr>
            <th scope="row" className="py-[var(--space-1)] pr-[var(--space-3)] font-normal">
              {a("edShortcutExit", locale)}
            </th>
            <td className="py-[var(--space-1)]">
              <kbd className="font-mono text-sm">Esc</kbd>
            </td>
          </tr>
        </tbody>
      </table>
    </PortalDialog>
  );
}
