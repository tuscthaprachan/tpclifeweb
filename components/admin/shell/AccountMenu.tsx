"use client";

import { signOutAction } from "@/app/admin/actions";
import { ConsoleIcon } from "@/components/admin/icons";
import { Popover } from "./Popover";

export interface AccountMenuProps {
  name: string;
  email: string;
  /** One line per role, already in the staff member's language. */
  roles: string[];
  labels: { accountMenu: string; signedInAs: string; roles: string; accountDetails: string; accountSecurity: string; signOut: string };
}

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = (word: string | undefined) => Array.from(word ?? "")[0] ?? "";
  return (parts.length > 1 ? first(parts[0]) + first(parts[1]) : first(parts[0]) || "?").toUpperCase();
}

export function AccountMenu({ name, email, roles, labels }: AccountMenuProps) {
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
      <ul className="console-menu-list mt-[var(--space-3)] border-t border-line pt-[var(--space-2)]">
        <li>
          <a href="/admin/account" className="console-menu-item">
            <ConsoleIcon name="account" />
            <span>{labels.accountDetails}</span>
          </a>
        </li>
        <li>
          <a href="/admin/security" className="console-menu-item">
            <ConsoleIcon name="security" />
            <span>{labels.accountSecurity}</span>
          </a>
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
