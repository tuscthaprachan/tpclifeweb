import type { ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { Heading } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";

export interface CardProps {
  title?: ReactNode;
  icon?: ConsoleIconName;
  description?: ReactNode;
  /** Buttons or links in the card's header row. */
  actions?: ReactNode;
  /** Real outline depth of the title. Defaults to 2. */
  level?: HeadingLevel;
  /** Set false when the body is a table that should run edge to edge. */
  padded?: boolean;
  children?: ReactNode;
  className?: string;
}

/** A section with a thin grey border and an optional title row. Never coloured. */
export function Card({ title, icon, description, actions, level = 2, padded = true, children, className = "" }: CardProps) {
  const hasHeader = title || actions || description;
  return (
    <section className={`console-card ${className}`}>
      {hasHeader ? (
        <div className="console-card-header">
          <div className="min-w-0 flex-1">
            {title ? (
              <Heading level={level} visualLevel={4} className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
                {icon ? <ConsoleIcon name={icon} className="text-ink-600" /> : null}
                <span>{title}</span>
              </Heading>
            ) : null}
            {description ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-[var(--space-2)]">{actions}</div> : null}
        </div>
      ) : null}
      {children ? <div className={padded ? "console-card-body" : undefined}>{children}</div> : null}
    </section>
  );
}
