import type { ReactNode } from "react";

/** A small neutral count pill. For status use `StatusTag`. */
export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`console-badge ${className}`}>{children}</span>;
}
