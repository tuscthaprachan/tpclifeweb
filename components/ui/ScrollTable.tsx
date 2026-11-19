"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";

const EDGE = "pointer-events-none absolute inset-y-0 z-10 w-[var(--space-3)] transition-opacity duration-150 motion-reduce:transition-none";

function edgeBars(side: "start" | "end") {
  const towards = side === "start" ? "right" : "left";
  return { background: `linear-gradient(to ${towards}, var(--scroll-shadow) 0 50%, var(--scroll-shadow-soft) 50% 100%)` };
}

export function ScrollTable({
  children,
  label,
  labelledBy,
  className,
}: {
  children: ReactNode;
  label?: string;
  labelledBy?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const pos = Math.abs(el.scrollLeft);
      const start = max > 1 && pos > 1;
      const end = max > 1 && pos < max - 1;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scrollable = edges.start || edges.end;

  return (
    <div className={cx("relative", className)}>
      <div aria-hidden="true" style={edgeBars("start")} className={cx(EDGE, "start-0 rtl:-scale-x-100", edges.start ? "opacity-100" : "opacity-0")} />
      <div
        ref={ref}
        tabIndex={scrollable ? 0 : undefined}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable && !labelledBy ? label : undefined}
        aria-labelledby={scrollable ? labelledBy : undefined}
        className="overflow-x-auto overscroll-x-contain"
      >
        {children}
      </div>
      <div aria-hidden="true" style={edgeBars("end")} className={cx(EDGE, "end-0 rtl:-scale-x-100", edges.end ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
