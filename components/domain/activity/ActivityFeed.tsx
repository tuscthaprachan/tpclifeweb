import NextLink from "next/link";

import { OWNER_LABEL_KEY } from "@/components/domain/form";
import { SectionBar } from "@/components/domain/home/SectionBar";
import { EmptyState, StatusTag, Tag, Timestamp } from "@/components/ui";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { NewsPost, Policy } from "@/lib/content/types";
import { buildActivityItems } from "./activityItems";
import { POLICY_STATUS_LABEL_KEY, POLICY_STATUS_TONE } from "./policyStatusLabel";

const HEADING_ID = "home-union-heading";

interface ActivityFeedProps {
  locale: Locale;
  news: NewsPost[];
  policies: Policy[];
  /** Ids of news posts already shown elsewhere on the page, so none appears twice. */
  excludeNewsIds?: readonly string[];
}

/**
 * The home page's student union and council block: a short, attributed list of
 * what TUSU and TUSC have each been doing, plus the route into the full policy
 * dashboard at `/{locale}/policy`.
 *
 * Every row carries its own `Owner` tag in visible text, not colour alone
 * (1.4.1): both bodies share the same `--fill-governance` indigo, so the tag's
 * label, not its colour, is what tells TUSU and TUSC apart.
 */
export function ActivityFeed({ locale, news, policies, excludeNewsIds }: ActivityFeedProps) {
  const items = buildActivityItems(news, policies, locale, { excludeIds: excludeNewsIds });

  return (
    <section aria-labelledby={HEADING_ID}>
      <SectionBar id={HEADING_ID} tone="governance">
        {UI.homeUnion[locale]}
      </SectionBar>

      {items.length === 0 ? (
        <EmptyState className="mt-[var(--space-3)]" title={UI.nothingHere[locale]} />
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <li key={item.id} className="border-b border-line py-[var(--space-3)]">
              <span className="flex flex-wrap items-center gap-[var(--space-2)]">
                <Tag tone="governance">{UI[OWNER_LABEL_KEY[item.owner]][locale]}</Tag>
                {item.kind === "policyUpdate" ? (
                  <StatusTag tone={POLICY_STATUS_TONE[item.status]} label={UI[POLICY_STATUS_LABEL_KEY[item.status]][locale]} />
                ) : null}
              </span>
              <span className="mt-[var(--space-1)] block font-bold">
                {item.kind === "news" ? <NextLink href={item.href}>{item.title}</NextLink> : item.title}
              </span>
              <Timestamp value={item.date} locale={locale} className="block text-[length:var(--text-sm)] text-ink-600" />
            </li>
          ))}
        </ul>
      )}

      <NextLink
        href={localePath(locale, "/policy")}
        className="inline-flex min-h-[var(--target-min)] items-center font-semibold"
      >
        {UI.policyTracker[locale]}
      </NextLink>
    </section>
  );
}
