"use client";

import { useState, type ReactNode } from "react";
import { disclosureProps, type HeadingLevel } from "@/lib/a11y";
import { cx } from "./cx";
import { Heading } from "./Heading";
import { ChevronDownIcon } from "./icons";

export interface AccordionSection {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  sections: AccordionSection[];
  /** Depth of each section's own heading in the page outline. Every Accordion section title is a real heading, not styled text (2.4.6). */
  headingLevel: HeadingLevel;
  defaultOpenIds?: string[];
  className?: string;
}

export function Accordion({ sections, headingLevel, defaultOpenIds, className }: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpenIds ?? []));

  function toggle(id: string) {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={cx("divide-y divide-line border-y border-line", className)}>
      {sections.map((section) => {
        const isOpen = open.has(section.id);
        const panelId = `${section.id}-panel`;
        const buttonId = `${section.id}-button`;
        return (
          <div key={section.id}>
            <Heading level={headingLevel} className="m-0">
              <button
                type="button"
                id={buttonId}
                {...disclosureProps(isOpen, panelId)}
                onClick={() => toggle(section.id)}
                className="flex min-h-[var(--target-min)] w-full items-center justify-between gap-[var(--space-3)] px-[var(--space-2)] py-[var(--space-3)] text-left text-base font-semibold text-ink-900 hover:bg-surface-alt"
              >
                {section.title}
                <ChevronDownIcon className={cx("shrink-0 transition-transform duration-[var(--motion-state)] ease-[var(--easing)]", isOpen && "rotate-180")} />
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!isOpen} className="px-[var(--space-2)] pb-[var(--space-4)] text-ink-900">
              {section.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
