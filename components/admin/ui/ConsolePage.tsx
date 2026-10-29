import type { ReactNode } from "react";

export type ConsolePageWidth = "narrow" | "content" | "wide" | "full";

const WIDTH: Record<ConsolePageWidth, string> = {
  narrow: "var(--console-width-narrow)",
  content: "var(--console-width-content)",
  wide: "var(--console-width-wide)",
  full: "none",
};

export interface ConsolePageProps {
  children: ReactNode;
  /** narrow: a single form or reading column. content: lists and detail pages. wide: dense tables. full: edge to edge. */
  width?: ConsolePageWidth;
  className?: string;
}

/** The body every console page shares: a left-aligned column with the console's spacing. */
export function ConsolePage({ children, width = "narrow", className = "" }: ConsolePageProps) {
  return (
    <div className={`console-page ${className}`} style={{ maxWidth: WIDTH[width] }}>
      {children}
    </div>
  );
}
