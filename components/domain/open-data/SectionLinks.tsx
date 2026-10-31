import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { fillText } from "./fill";
import { TUSC_SECTIONS, type TuscSectionKey } from "./sections";

interface SectionLinksProps {
  locale: Locale;
  headingLevel: HeadingLevel;
  /** Values for `{n}` in a section's description, by section. */
  counts?: Partial<Record<TuscSectionKey, number>>;
}

/** The sections of TUSC open data, each with one line saying what is there. */
export function SectionLinks({ locale, headingLevel, counts = {} }: SectionLinksProps) {
  return (
    <nav aria-labelledby="od-sections-heading">
      <Heading level={headingLevel} id="od-sections-heading" className="m-0 mb-[var(--space-3)]">
        {UI.odSectionsHeading[locale]}
      </Heading>
      <ul className="m-0 list-none border-t border-line p-0">
        {TUSC_SECTIONS.filter((section) => section.description).map((section) => (
          <li key={section.key} className="border-b border-line py-[var(--space-3)]">
            <Link href={localePath(locale, section.path)} className="text-lg font-semibold text-action underline hover:text-action-hover">
              {section.label[locale]}
            </Link>
            <p className="m-0 mt-[var(--space-1)] max-w-[var(--measure-en)] text-ink-900">
              {fillText(section.description?.[locale] ?? "", { n: counts[section.key] ?? 0 })}
            </p>
          </li>
        ))}
      </ul>
    </nav>
  );
}
