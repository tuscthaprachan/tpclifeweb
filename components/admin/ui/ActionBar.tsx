import type { ReactNode } from "react";
import { ConsoleIcon } from "@/components/admin/icons";

export interface ActionBarProps {
  /** The form's buttons. */
  children: ReactNode;
  /** dirty shows `dirtyText`, saved shows `savedText`, idle shows neither. */
  state?: "idle" | "dirty" | "saved";
  dirtyText?: string;
  savedText?: string;
  className?: string;
}

/** A bar pinned to the bottom of the screen that keeps a long form's buttons in reach. The state text is announced politely. */
export function ActionBar({ children, state = "idle", dirtyText, savedText, className = "" }: ActionBarProps) {
  const text = state === "dirty" ? dirtyText : state === "saved" ? savedText : undefined;
  return (
    <div className={`console-actionbar ${className}`}>
      <p role="status" aria-live="polite" className="m-0 flex min-w-0 flex-1 items-center gap-[var(--space-2)] text-sm text-ink-600">
        {text ? (
          <>
            <ConsoleIcon name={state === "saved" ? "check" : "edit"} size={16} />
            <span>{text}</span>
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">{children}</div>
    </div>
  );
}
