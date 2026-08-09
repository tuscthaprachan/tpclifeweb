import NextLink from "next/link";
import { OWNER_LABEL_KEY } from "@/components/domain/form";
import { Heading } from "@/components/ui/Heading";
import { StatusTag } from "@/components/ui/StatusTag";
import { Tag } from "@/components/ui/Tag";
import { cx } from "@/components/ui/cx";
import type { HeadingLevel } from "@/lib/a11y";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Policy } from "@/lib/sanity/types";
import { PolicyLastUpdated } from "./PolicyLastUpdated";
import { PolicyProgress } from "./PolicyProgress";
import { isResolvedPolicy } from "./relations";
import { STATUS_LABEL_KEY, STATUS_TONE } from "./statusLabels";

interface PolicyListItemProps {
  policy: Policy;
  locale: Locale;
  /** The depth every policy title sits at. Every row is a sibling, so they all share one level (1.3.1). */
  headingLevel: HeadingLevel;
  now?: Date;
  className?: string;
}

/**
 * One row of the policy dashboard. A list, not a card grid: per
 * CONTRIBUTING.md, "policies differ in weight and status", so every row
 * shows the same facts in the same order rather than being squeezed into an
 * equal-sized tile.
 *
 * Carries the owner (governance fill, since every policy is governance
 * content by definition), the status (icon + word + colour via StatusTag),
 * the honest progress-or-latest-update (PolicyProgress), the always-visible
 * staleness line (PolicyLastUpdated), and, where it applies, which policy
 * this one scrutinises (the forward half of the oversight relationship; the
 * reverse "scrutinised by" list lives on the detail page, where there is
 * room to show every scrutinising item in full).
 */
export function PolicyListItem({ policy, locale, headingLevel, now, className }: PolicyListItemProps) {
  const href = localePath(locale, `/policy/${policy.slug.current}`);
  const areaLabel = pick(policy.policyArea, locale);
  const oversightTarget = isResolvedPolicy(policy.oversightOf) ? policy.oversightOf : null;

  return (
    <li className={cx("flex flex-col gap-[var(--space-2)] py-[var(--space-4)]", className)}>
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        <Tag tone="governance">{UI[OWNER_LABEL_KEY[policy.owner]][locale]}</Tag>
        {areaLabel ? <span className="text-sm text-ink-600">{areaLabel}</span> : null}
      </div>

      <Heading level={headingLevel} className="text-lg">
        <NextLink href={href} className="text-action no-underline hover:text-action-hover hover:underline">
          {pick(policy.title, locale)}
        </NextLink>
      </Heading>

      <p className="m-0 text-ink-600">{pick(policy.summary, locale)}</p>

      <div className="flex flex-wrap items-center gap-[var(--space-3)]">
        <StatusTag tone={STATUS_TONE[policy.status]} label={UI[STATUS_LABEL_KEY[policy.status]][locale]} />
        <PolicyLastUpdated policy={policy} locale={locale} now={now} />
      </div>

      <PolicyProgress policy={policy} locale={locale} className="max-w-[24rem]" />

      {oversightTarget ? (
        <p className="m-0 text-sm text-ink-600">
          {UI.oversightOf[locale]}:{" "}
          <NextLink href={localePath(locale, `/policy/${oversightTarget.slug.current}`)} className="font-medium text-action underline">
            {pick(oversightTarget.title, locale)}
          </NextLink>
        </p>
      ) : null}
    </li>
  );
}
