import type { ReactNode } from "react";
import { cx } from "./cx";
import type { Space } from "./Stack";

interface ClusterProps {
  children: ReactNode;
  className?: string;
  space?: Space;
  align?: "start" | "center" | "end" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  as?: "div" | "section" | "ul" | "ol";
}

const ALIGN_CLASS: Record<NonNullable<ClusterProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
};

const JUSTIFY_CLASS: Record<NonNullable<ClusterProps["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

/** A wrapping horizontal group, for things like tag lists and button rows. */
export function Cluster({ children, className, space = 4, align = "center", justify = "start", as: Tag = "div" }: ClusterProps) {
  return (
    <Tag className={cx("flex flex-wrap", ALIGN_CLASS[align], JUSTIFY_CLASS[justify], className)} style={{ gap: `var(--space-${space})` }}>
      {children}
    </Tag>
  );
}
