import Link from "next/link";
import type { ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";

export interface StatCardProps {
  icon?: ConsoleIconName;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Makes the whole card a link, named by `label`. */
  href?: string;
  /** attention adds a warning icon before the hint, so the state is never colour alone. Give it a `hint` that says why. */
  tone?: "neutral" | "attention";
  className?: string;
}

/** A single figure with a label. Links through its label, stretched over the whole card. */
export function StatCard({ icon, label, value, hint, href, tone = "neutral", className = "" }: StatCardProps) {
  return (
    <div className={`console-stat ${href ? "console-stat-link" : ""} ${className}`}>
      <p className="m-0 flex items-center gap-[var(--space-2)] text-sm text-ink-600">
        {icon ? <ConsoleIcon name={icon} /> : null}
        {href ? (
          <Link href={href} className="console-stat-anchor">
            {label}
          </Link>
        ) : (
          <span>{label}</span>
        )}
      </p>
      <p className="m-0 mt-[var(--space-1)] text-2xl font-semibold leading-tight text-ink-900">{value}</p>
      {hint ? (
        <p className={`m-0 mt-[var(--space-1)] flex items-start gap-[var(--space-1)] text-sm ${tone === "attention" ? "font-semibold text-ink-900" : "text-ink-600"}`}>
          {tone === "attention" ? <ConsoleIcon name="warning" size={16} className="mt-[0.2em]" /> : null}
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}
