import type { ReactNode } from "react";
import { cx } from "./cx";
import type { Space } from "./Stack";

interface GridProps {
  children: ReactNode;
  className?: string;
  space?: Space;
  /** Minimum width a column may shrink to before the grid wraps to fewer columns. No breakpoints needed. */
  minColumnWidth?: string;
  as?: "div" | "section" | "ul" | "ol";
}

/** An auto-fitting card grid. Reflows by itself, so it never needs to scroll horizontally (1.4.10). */
export function Grid({ children, className, space = 4, minColumnWidth = "16rem", as: Tag = "div" }: GridProps) {
  return (
    <Tag
      className={cx("grid", className)}
      style={{ gap: `var(--space-${space})`, gridTemplateColumns: `repeat(auto-fit, minmax(min(${minColumnWidth}, 100%), 1fr))` }}
    >
      {children}
    </Tag>
  );
}
