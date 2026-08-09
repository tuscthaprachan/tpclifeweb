/**
 * Width-constrained wrapper used by the site chrome (header, footer, phase
 * banner). Deliberately not `components/ui/Container`: that component is
 * owned by a parallel workstream and may not exist yet, and importing it
 * here would create a merge seam between two agents editing at once. This
 * duplicates a couple of lines of CSS instead, reading the same
 * `--width-content` / `--gutter` tokens so it still looks identical to
 * whatever the ui agent ships.
 */

import type { ReactNode } from "react";

export function ShellContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[var(--width-content)] px-[var(--gutter)] ${className}`.trim()}>
      {children}
    </div>
  );
}
