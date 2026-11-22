import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, PageTitle, Stack } from "@/components/ui";
import { getTopicPages } from "@/lib/content";
import { mergeHubItems } from "@/lib/content/hub";
import { SECTIONS, type ContentSection } from "@/lib/content/sections";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { ContentPageCards } from "./ContentPageCards";
import { SECTION_TEXT } from "./text";

export async function SectionHub({ sectionKey, locale }: { sectionKey: ContentSection; locale: Locale }) {
  const section = SECTIONS[sectionKey];
  const pages = await getTopicPages(sectionKey);
  const items = mergeHubItems(section, pages);
  const label = pick(section.label, locale);

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label }]} />
      <Stack space={8} className="pb-[var(--space-12)] pt-[var(--space-2)]">
        <Stack space={3}>
          <PageTitle path={section.path} icon={section.icon}>
            {label}
          </PageTitle>
          <p className="m-0 text-lg text-ink-900" style={{ maxWidth: `var(--measure-${locale})` }}>
            {pick(section.intro, locale)}
          </p>
        </Stack>

        {items.length === 0 ? (
          <EmptyState title={SECTION_TEXT.nothingYet[locale]} />
        ) : (
          <ContentPageCards
            items={items}
            section={sectionKey}
            locale={locale}
            heading={SECTION_TEXT.listHeading[locale]}
            staleLabel={SECTION_TEXT.staleReviewLabel[locale]}
          />
        )}
      </Stack>
    </Container>
  );
}
