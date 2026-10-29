import type { ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { Heading } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";

export interface EmptyPanelProps {
  icon?: ConsoleIconName;
  title: ReactNode;
  children?: ReactNode;
  /** The next step, usually a Button. */
  action?: ReactNode;
  level?: HeadingLevel;
  className?: string;
}

/** What to show where a list or section has nothing yet: say why and offer the next step. */
export function EmptyPanel({ icon = "info", title, children, action, level = 2, className = "" }: EmptyPanelProps) {
  return (
    <div className={`console-empty ${className}`}>
      <ConsoleIcon name={icon} size={28} className="text-ink-600" />
      <Heading level={level} visualLevel={4} className="m-0 font-semibold">
        {title}
      </Heading>
      {children ? <div className="max-w-[40ch] text-sm text-ink-600">{children}</div> : null}
      {action ? <div className="mt-[var(--space-1)]">{action}</div> : null}
    </div>
  );
}
