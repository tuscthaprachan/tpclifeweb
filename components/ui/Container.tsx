import type { ReactNode } from "react";
import { cx } from "./cx";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** "content" is the default page width. "narrow" is for a single-column form or reading page, which is uncomfortable at full width. */
  width?: "content" | "narrow";
}

/** Centres content and applies the page gutter. Nothing else. */
export function Container({ children, className, width = "content" }: ContainerProps) {
  return (
    <div
      className={cx("mx-auto w-full px-[var(--gutter)]", className)}
      style={{ maxWidth: width === "narrow" ? "var(--width-narrow)" : "var(--width-content)" }}
    >
      {children}
    </div>
  );
}
