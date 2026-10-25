import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { PaletteSection } from "./Palette";
import { ContentSection } from "./sections/ContentSection";
import { FormsSection } from "./sections/FormsSection";
import { InteractiveSection } from "./sections/InteractiveSection";
import { LayoutSection } from "./sections/LayoutSection";

interface DesignPageProps {
  params: Promise<{ locale: string }>;
}

const TOC: Array<{ href: string; label: string }> = [
  { href: "#palette", label: "Colour palette" },
  { href: "#container", label: "Layout: Container, Stack, Cluster, Grid" },
  { href: "#heading", label: "Content: Heading, Prose, SummaryList, DataTable, Tag, StatusTag, banners, no tinted boxes..." },
  { href: "#text-input", label: "Forms: TextInput, Select, Radios, DateInput, ErrorSummary..." },
  { href: "#button", label: "Interactive: Button, Link, Tabs, Accordion, Dialog" },
];

/**
 * Internal design system reference, not part of the public bilingual site.
 * The prose on this page is written in English only and does not draw on
 * lib/i18n/strings.ts: it is documentation for the people building the rest
 * of the site, not a page a student will ever land on. The live examples it
 * renders take the real `locale` from the route, though, so a reviewer can
 * still see and switch between how each component behaves in Thai and in
 * English.
 *
 * This route sits under app/[locale]/layout.tsx, which supplies <html lang>,
 * the header, footer and main landmark. This file renders only its own
 * content, starting at the h1 below.
 */
export default async function DesignPage({ params }: DesignPageProps) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  return (
    <Container>
      <Stack space={12} className="py-[var(--space-12)]">
        <Stack space={4}>
          <Heading level={1}>Design system</Heading>
          <p className="m-0 max-w-[var(--measure-en)] text-ink-900">
            Every component in components/ui, documented with what it is for, when not to use it, a live example of its
            states, and the accessibility decisions behind it. Rendered here for the <strong>{locale}</strong> locale;
            switch the URL prefix to see the other one.
          </p>
          <nav aria-label="On this page">
            <ul className="m-0 flex flex-col gap-[var(--space-1)] pl-[var(--space-5)] text-sm">
              {TOC.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-action underline hover:text-action-hover">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Stack>

        <PaletteSection headingLevel={2} />
        <LayoutSection headingLevel={2} />
        <ContentSection headingLevel={2} locale={locale} />
        <FormsSection headingLevel={2} locale={locale} />
        <InteractiveSection headingLevel={2} locale={locale} />
      </Stack>
    </Container>
  );
}
