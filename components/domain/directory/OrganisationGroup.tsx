import { Heading, Stack } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import type { Organisation } from "@/lib/sanity/types";
import { OrganisationListItem } from "./OrganisationListItem";

interface OrganisationGroupProps {
  heading: string;
  headingLevel: HeadingLevel;
  organisations: Organisation[];
  locale: Locale;
}

/** One section of the directory list: a faculty, or the clubs/other group. Renders nothing when empty, so an active filter never leaves a bare heading. */
export function OrganisationGroup({ heading, headingLevel, organisations, locale }: OrganisationGroupProps) {
  if (organisations.length === 0) return null;

  return (
    <Stack space={2} as="section">
      <Heading level={headingLevel}>{heading}</Heading>
      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {organisations.map((org) => (
          <OrganisationListItem key={org._id} org={org} locale={locale} />
        ))}
      </ul>
    </Stack>
  );
}
