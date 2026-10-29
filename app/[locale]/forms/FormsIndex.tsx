import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { FormsResults, LiveFormsResults } from "@/components/domain/form/FormsResults";
import { Heading } from "@/components/ui/Heading";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Stack } from "@/components/ui/Stack";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getForms } from "@/lib/content";

export async function FormsIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const forms = await getForms();

  return (
    <ShellContainer className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.forms[locale] }]} />

      <Stack space={8}>
        <Stack space={2}>
          <Heading level={1}>{UI.forms[locale]}</Heading>
          <p className="m-0 text-ink-600">{UI.formsIntro[locale]}</p>
        </Stack>

        <QueryBoundary filtered={filtered} fallback={<FormsResults locale={locale} forms={forms} query={{}} />}>
          <LiveFormsResults locale={locale} forms={forms} />
        </QueryBoundary>
      </Stack>
    </ShellContainer>
  );
}
