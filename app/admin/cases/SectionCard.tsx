import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Heading } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";

/** A lucide icon with the console's size and stroke conventions. Decorative. */
export function Glyph({ icon: Icon, size = 18, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return <Icon aria-hidden="true" focusable="false" size={size} strokeWidth={1.75} absoluteStrokeWidth className={className ? `shrink-0 ${className}` : "shrink-0"} />;
}

export interface SectionCardProps {
  title: ReactNode;
  icon: LucideIcon;
  id?: string;
  description?: ReactNode;
  actions?: ReactNode;
  level?: HeadingLevel;
  children?: ReactNode;
}

/** The console card with any lucide icon in its title, for case sections whose icon is not in the shared set. */
export function SectionCard({ title, icon, id, description, actions, level = 2, children }: SectionCardProps) {
  return (
    <section className="console-card" aria-labelledby={id}>
      <div className="console-card-header">
        <div className="min-w-0 flex-1">
          <Heading level={level} visualLevel={4} id={id} className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
            <Glyph icon={icon} className="text-ink-600" />
            <span>{title}</span>
          </Heading>
          {description ? <p className="m-0 mt-[var(--space-1)] text-sm text-ink-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-[var(--space-2)]">{actions}</div> : null}
      </div>
      {children ? <div className="console-card-body flex flex-col gap-[var(--space-3)]">{children}</div> : null}
    </section>
  );
}
