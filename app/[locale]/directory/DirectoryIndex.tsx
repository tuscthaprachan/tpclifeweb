import { DirectoryResults, LiveDirectoryResults } from "@/components/domain/directory/DirectoryResults";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Stack } from "@/components/ui";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getOrganisations } from "@/lib/content";

export async function DirectoryIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const organisations = await getOrganisations();

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.directory[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.directory[locale]}</Heading>

        <QueryBoundary filtered={filtered} fallback={<DirectoryResults locale={locale} organisations={organisations} query={{}} />}>
          <LiveDirectoryResults locale={locale} organisations={organisations} />
        </QueryBoundary>
      </Stack>
    </Container>
  );
}
