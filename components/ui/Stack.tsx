import type { ReactNode } from "react";
import { cx } from "./cx";

/** The space scale from tokens.css. Kept to a literal union so a caller cannot pass an arbitrary pixel value. */
export type Space = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24;

interface StackProps {
  children: ReactNode;
  className?: string;
  space?: Space;
  as?: "div" | "section" | "ul" | "ol";
}

/**
 * Vertical rhythm: a flex column with one gap value. Gap is set inline
 * because Tailwind's arbitrary-value classes are scanned as static source
 * text, not built from a runtime template, so a token step chosen by a prop
 * cannot become a class name at build time.
 */
export function Stack({ children, className, space = 4, as: Tag = "div" }: StackProps) {
  return (
    <Tag className={cx("flex flex-col", className)} style={{ gap: `var(--space-${space})` }}>
      {children}
    </Tag>
  );
}
