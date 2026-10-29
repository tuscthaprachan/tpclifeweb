import type { ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { Heading } from "@/components/ui";
import type { LucideIcon } from "lucide-react";

export interface FormSectionProps {
  /** Used for the heading id and the hint id. */
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  /** A console icon name, or any lucide icon where the console set has none that fits. */
  icon?: ConsoleIconName | LucideIcon;
  children: ReactNode;
}

/** A titled card holding one group of related fields in a content form. The title is a real h2. */
export function FormSection({ id, legend, hint, icon, children }: FormSectionProps) {
  const Icon = typeof icon === "function" || typeof icon === "object" ? icon : null;
  return (
    <section className="console-card" aria-labelledby={`${id}-title`} aria-describedby={hint ? `${id}-hint` : undefined}>
      <div className="console-card-header">
        <div className="min-w-0 flex-1">
          <Heading level={2} visualLevel={4} id={`${id}-title`} className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
            {typeof icon === "string" ? (
              <ConsoleIcon name={icon} className="text-ink-600" />
            ) : Icon ? (
              <Icon aria-hidden="true" focusable="false" size={18} strokeWidth={1.75} absoluteStrokeWidth className="shrink-0 text-ink-600" />
            ) : null}
            <span>{legend}</span>
          </Heading>
          {hint ? (
            <p id={`${id}-hint`} className="m-0 mt-[var(--space-1)] text-sm text-ink-600">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
      <div className="console-card-body flex flex-col gap-[var(--space-5)]">{children}</div>
    </section>
  );
}
