import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { SectionNav } from "@/components/ui/SectionNav";
import { externalLinkProps, externalLinkSuffix } from "@/lib/a11y";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { OPEN_DATA_PATH, TUSC_PATH, TUSC_SECTIONS, tuscSection, type TuscSectionKey } from "./sections";

interface TuscShellProps {
  locale: Locale;
  /** The section the page belongs to; marked as the current page in the section navigation. */
  current: TuscSectionKey;
  /** Crumbs below the section, ending with the current page (no path). Omit on a section's own page. */
  trail?: BreadcrumbItem[];
  children: ReactNode;
}

/**
 * The frame of every page under /about/open-data/tusc: breadcrumbs, the section navigation
 * (beside the content from `md`, above it on a phone) and the licence note.
 */
export function TuscShell({ locale, current, trail = [], children }: TuscShellProps) {
  const section = tuscSection(current);
  const crumbs: BreadcrumbItem[] = [
    { label: UI.home[locale], path: "/" },
    { label: UI.about[locale], path: "/about" },
    { label: UI.odOpenData[locale], path: OPEN_DATA_PATH },
    { label: UI.odTuscShort[locale], path: TUSC_PATH },
    ...(current === "overview" ? [] : [{ label: section.label[locale], path: section.path }]),
    ...trail,
  ];
  const last = crumbs[crumbs.length - 1];
  if (last) crumbs[crumbs.length - 1] = { label: last.label };

  return (
    <Container>
      <Breadcrumbs locale={locale} items={crumbs} />
      <div className="grid gap-y-[var(--space-5)] pb-[var(--space-8)] pt-[var(--space-2)] md:grid-cols-[15rem_minmax(0,1fr)] md:gap-x-[var(--space-8)]">
        <div className="md:sticky md:top-[var(--space-4)] md:self-start">
          <SectionNav
            locale={locale}
            items={TUSC_SECTIONS.map((s) => ({
              label: s.label[locale],
              href: localePath(locale, s.path),
              current: s.key === current,
            }))}
          />
        </div>
        <div className="min-w-0">
          {children}
          <section aria-labelledby="od-about-data" className="mt-[var(--space-8)] border-t border-line pt-[var(--space-4)]">
            <Heading level={2} id="od-about-data" className="m-0 mb-[var(--space-2)] text-lg">
              {UI.odAboutThisData[locale]}
            </Heading>
            <p className="m-0 mb-[var(--space-2)]">
              {UI.odLicenceHeading[locale]}:{" "}
              <a href={UI.odLicenceUrl[locale]} {...externalLinkProps(true)} className="text-action underline">
                {UI.odLicenceName[locale]}
                <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span>
              </a>
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-5)] p-0">
              <li>
                <Link href={`${localePath(locale, OPEN_DATA_PATH)}#report`} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
                  {UI.odReportThisPage[locale]}
                </Link>
              </li>
              <li>
                <Link href={localePath(locale, OPEN_DATA_PATH)} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
                  {UI.odAllOpenData[locale]}
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Container>
  );
}
