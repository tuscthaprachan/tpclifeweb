import type { ReactNode } from "react";
import { Heading, Stack } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import type { Organisation } from "@/lib/content/types";
import { AudienceTag, type Audience } from "./AudienceTag";
import { OrganisationListItem } from "./OrganisationListItem";

interface OrganisationGroupProps {
  heading: string;
  headingLevel: HeadingLevel;
  organisations: Organisation[];
  locale: Locale;
  audience: Audience;
  intro?: ReactNode;
  id?: string;
}

export function OrganisationGroup({ heading, headingLevel, organisations, locale, audience, intro, id }: OrganisationGroupProps) {
  if (organisations.length === 0) return null;

  return (
    <section id={id}>
      <Stack space={2}>
        <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
          <Heading level={headingLevel}>{heading}</Heading>
          <AudienceTag audience={audience} locale={locale} />
        </div>
        {intro ? <p className="m-0 text-sm text-ink-600">{intro}</p> : null}
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {organisations.map((org) => (
            <OrganisationListItem key={org._id} org={org} locale={locale} />
          ))}
        </ul>
      </Stack>
    </section>
  );
}
