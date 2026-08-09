import type { ReactNode } from "react";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import type { HeadingLevel } from "@/lib/a11y";

interface ComponentDocProps {
  id: string;
  name: string;
  headingLevel: HeadingLevel;
  purpose: string;
  whenNotToUse: string;
  a11yNotes?: string[];
  children: ReactNode;
}

/**
 * One entry in the component catalogue: what it is for, when not to use it,
 * a live rendered example, and accessibility notes. This page is an
 * internal reference for the people building the rest of the site, so it is
 * dense rather than polished on purpose.
 *
 * Each entry is a plain `<section>` with no `aria-labelledby`, so it does
 * NOT become a landmark region. With roughly thirty of these on one page,
 * turning each into a named "region" would flood a screen reader user's
 * landmark list; the heading alone is enough to navigate this page by
 * headings, which every screen reader already supports well.
 */
export function ComponentDoc({ id, name, headingLevel, purpose, whenNotToUse, a11yNotes, children }: ComponentDocProps) {
  return (
    <Stack space={4} as="section" className="border-t border-line pt-[var(--space-8)]">
      <Heading level={headingLevel} id={id}>
        {name}
      </Heading>
      <p className="m-0 text-ink-900">
        <strong>For: </strong>
        {purpose}
      </p>
      <p className="m-0 text-ink-900">
        <strong>Not for: </strong>
        {whenNotToUse}
      </p>
      <div className="rounded-panel border border-line bg-surface-alt p-[var(--space-6)]">
        <Stack space={4}>{children}</Stack>
      </div>
      {a11yNotes && a11yNotes.length > 0 ? (
        <div className="rounded-panel border-l-[var(--border-width-thick)] border-info bg-info-soft px-[var(--space-4)] py-[var(--space-3)]">
          <p className="m-0 font-semibold text-ink-900">Accessibility notes</p>
          <ul className="m-0 mt-[var(--space-1)] flex flex-col gap-[var(--space-1)] pl-[var(--space-5)] text-ink-900">
            {a11yNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Stack>
  );
}
