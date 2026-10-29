import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { LivePolicyResults, PolicyResults } from "@/components/domain/policy/PolicyResults";
import { Heading } from "@/components/ui/Heading";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { Stack } from "@/components/ui/Stack";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getPolicies } from "@/lib/content";

export async function PolicyIndex({ locale, filtered }: { locale: Locale; filtered: boolean }) {
  const policies = await getPolicies();
  const generatedAt = new Date().toISOString();

  return (
    <ShellContainer className="pb-8 pt-2">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.policyTracker[locale] }]} />

      <Stack space={8}>
        <Stack space={2}>
          <Heading level={1}>{UI.policyTracker[locale]}</Heading>
          <p className="m-0 text-ink-600">{UI.policyIntro[locale]}</p>
        </Stack>

        <QueryBoundary
          filtered={filtered}
          fallback={<PolicyResults locale={locale} policies={policies} generatedAt={generatedAt} query={{}} />}
        >
          <LivePolicyResults locale={locale} policies={policies} generatedAt={generatedAt} />
        </QueryBoundary>
      </Stack>
    </ShellContainer>
  );
}
