"use client";

import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";
import { ConsoleIcon } from "@/components/admin/icons";
import type { GoShortcut } from "@/lib/admin/shortcuts";
import { Popover } from "./Popover";

export interface AccountMenuProps {
  name: string;
  email: string;
  /** One line per role, already in the staff member's language. */
  roles: string[];
  labels: { accountMenu: string; signedInAs: string; roles: string; accountDetails: string; accountNotifications: string; accountSecurity: string; signOut: string; shortcutsMenu: string; shortcutsGoTo: string; shortcutsThen: string };
  shortcuts: GoShortcut[];
  onShowShortcuts: () => void;
}

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = (word: string | undefined) => Array.from(word ?? "")[0] ?? "";
  return (parts.length > 1 ? first(parts[0]) + first(parts[1]) : first(parts[0]) || "?").toUpperCase();
}

export function AccountMenu({ name, email, roles, labels, shortcuts, onShowShortcuts }: AccountMenuProps) {
  return (
    <Popover label={labels.accountMenu} trigger={<span className="console-avatar" aria-hidden="true">{initials(name, email)}</span>} panelClassName="console-popover-account">
      <p className="console-popover-title">{labels.signedInAs}</p>
      <p className="m-0 break-words font-semibold text-ink-900">{name || email}</p>
      {name ? <p className="m-0 break-all text-sm text-ink-600">{email}</p> : null}
      {roles.length > 0 ? (
        <>
          <p className="console-popover-title mt-[var(--space-3)]">{labels.roles}</p>
          <ul className="m-0 list-none p-0 text-sm text-ink-900">
            {roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        </>
      ) : null}
      {shortcuts.length > 0 ? (
        <details className="mt-[var(--space-3)] border-t border-line pt-[var(--space-2)]">
          <summary className="min-h-[var(--target-min)] cursor-pointer py-[var(--space-2)] text-sm font-semibold">{labels.shortcutsGoTo}</summary>
          <ul className="m-0 grid list-none gap-[var(--space-1)] p-0 text-sm">
            {shortcuts.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-[var(--space-3)]">
                <span>{s.label}</span>
                <span className="inline-flex items-center gap-[var(--space-1)]">
                  <kbd className="console-kbd !m-0 !inline">g</kbd>
                  <span className="text-ink-600">{labels.shortcutsThen}</span>
                  <kbd className="console-kbd !m-0 !inline">{s.key}</kbd>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <ul className="console-menu-list mt-[var(--space-3)] border-t border-line pt-[var(--space-2)]">
        <li>
          <Link href="/admin/account" className="console-menu-item">
            <ConsoleIcon name="account" />
            <span>{labels.accountDetails}</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/notifications" className="console-menu-item">
            <ConsoleIcon name="notifications" />
            <span>{labels.accountNotifications}</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/security" className="console-menu-item">
            <ConsoleIcon name="security" />
            <span>{labels.accountSecurity}</span>
          </Link>
        </li>
        <li>
          <button type="button" onClick={onShowShortcuts} className="console-menu-item">
            <ConsoleIcon name="keyboard" />
            <span className="flex-1 text-left">{labels.shortcutsMenu}</span>
            <kbd className="console-kbd !m-0 !inline">?</kbd>
          </button>
        </li>
        <li>
          <form action={signOutAction}>
            <button type="submit" className="console-menu-item">
              <ConsoleIcon name="signOut" />
              <span>{labels.signOut}</span>
            </button>
          </form>
        </li>
      </ul>
    </Popover>
  );
}
