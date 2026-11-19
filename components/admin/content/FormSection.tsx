import type { ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { Heading } from "@/components/ui";
import { SectionDisclosure } from "./SectionDisclosure";
import type { LucideIcon } from "lucide-react";

export interface FormSectionProps {
  /** Used for the heading id and the hint id. */
  id: string;
  legend: ReactNode;
  hint?: ReactNode;
  /** A console icon name, or any lucide icon where the console set has none that fits. */
  icon?: ConsoleIconName | LucideIcon;
  /** Fold the section away. It stays open when it has an error or is linked to. */
  collapsible?: boolean;
  /** For a collapsible section: start open. */
  defaultOpen?: boolean;
  /** For a collapsible section: the names (or name prefixes) of its fields, so an error opens it. */
  errorPrefixes?: readonly string[];
  children: ReactNode;
}

/** A titled card holding one group of related fields in a content form. The title is a real h2. */
export function FormSection({ id, legend, hint, icon, collapsible, defaultOpen, errorPrefixes, children }: FormSectionProps) {
  const Icon = typeof icon === "function" || typeof icon === "object" ? icon : null;
  const heading = (
    <Heading level={2} visualLevel={4} id={`${id}-title`} className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
      {typeof icon === "string" ? (
        <ConsoleIcon name={icon} className="text-ink-600" />
      ) : Icon ? (
        <Icon aria-hidden="true" focusable="false" size={18} strokeWidth={1.75} absoluteStrokeWidth className="shrink-0 text-ink-600" />
      ) : null}
      <span>{legend}</span>
    </Heading>
  );
  if (collapsible) {
    return (
      <SectionDisclosure id={id} summary={heading} hint={hint} defaultOpen={defaultOpen} errorPrefixes={errorPrefixes}>
        {children}
      </SectionDisclosure>
    );
  }
  return (
    <section className="console-card" aria-labelledby={`${id}-title`} aria-describedby={hint ? `${id}-hint` : undefined}>
      <div className="console-card-header">
        <div className="min-w-0 flex-[1_1_12rem]">
          {heading}
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
