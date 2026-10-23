import { OWNER_LABEL_KEY } from "@/components/domain/form";
import { Button, EmptyState, Heading, Link as UiLink, Stack, StatusTag, Tag, Timestamp } from "@/components/ui";
import { localePath, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { NewsPost, Policy } from "@/lib/content/types";
import { buildActivityItems } from "./activityItems";
import { POLICY_STATUS_LABEL_KEY, POLICY_STATUS_TONE } from "./policyStatusLabel";

/*
 * TODO: add to UI strings. No shared heading exists for the combined
 * TUSU/TUSC activity feed; UI.policyTracker names the policy dashboard
 * itself, not this feed of recent activity. Using a local literal, reported
 * in the home agent's final report.
 */
const ACTIVITY_HEADING: LocaleString = {
  th: "ความเคลื่อนไหวของ อมธ. และสภานักศึกษา ท่าพระจันทร์",
  en: "TUSU and TUSC activity",
};

interface ActivityFeedProps {
  locale: Locale;
  /** The same news list the home page already fetched for section 3; filtered here to TUSU/TUSC ownership. */
  news: NewsPost[];
  policies: Policy[];
}

/**
 * Section 5, at the very bottom of the home page: an attributed feed of
 * what TUSU and TUSC have each been doing, plus the route into the full
 * policy dashboard (owned by a parallel workstream at `/{locale}/policy`,
 * linked here by URL only, never by importing its components).
 *
 * Every row carries its own `Owner` tag (`UI.ownerTusu` / `UI.ownerTusc`) in
 * visible text, not colour alone (1.4.1): both bodies share the same
 * `--fill-governance` indigo, so the tag's label, not its colour, is what
 * tells TUSU and TUSC apart.
 */
export function ActivityFeed({ locale, news, policies }: ActivityFeedProps) {
  const items = buildActivityItems(news, policies, locale);
  const heading = ACTIVITY_HEADING[locale];

  return (
    <Stack space={4} as="section">
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
        <Heading level={2} className="m-0">
          {heading}
        </Heading>
        <Button href={localePath(locale, "/policy")} variant="secondary" size="sm">
          {UI.policyTracker[locale]}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title={UI.nothingHere[locale]} />
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-[var(--space-2)] py-[var(--space-4)]">
              <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                <Tag tone="governance">{UI[OWNER_LABEL_KEY[item.owner]][locale]}</Tag>
                {item.kind === "policyUpdate" ? (
                  <StatusTag tone={POLICY_STATUS_TONE[item.status]} label={UI[POLICY_STATUS_LABEL_KEY[item.status]][locale]} />
                ) : null}
              </div>
              <Heading level={3} className="m-0 text-lg">
                {item.kind === "news" ? (
                  <UiLink href={item.href} locale={locale} className="text-ink-900 no-underline hover:text-action hover:underline">
                    {item.title}
                  </UiLink>
                ) : (
                  item.title
                )}
              </Heading>
              <p className="m-0 text-ink-600">{item.detail}</p>
              <Timestamp value={item.date} locale={locale} className="text-sm text-ink-600" />
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}
