import NextLink from "next/link";
import { OWNER_LABEL_KEY } from "@/components/domain/form";
import { StatusTag } from "@/components/ui/StatusTag";
import { Tag } from "@/components/ui/Tag";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { Policy } from "@/lib/sanity/types";
import { STATUS_LABEL_KEY, STATUS_TONE } from "./statusLabels";

interface PolicyRelationLinkProps {
  /** A resolved oversight target: either the policy this one scrutinises, or one of the policies scrutinising it. Only the fields in `POLICY_OVERSIGHT_PROJECTION` (lib/sanity/queries.ts) are guaranteed present. */
  policy: Pick<Policy, "_id" | "title" | "slug" | "summary" | "owner" | "status">;
  locale: Locale;
}

/**
 * Renders one side of the oversight relationship (Policy.oversightOf):
 * which body owns the related policy, its current status, and a link to its
 * own detail page. Used in both directions, per CONTRIBUTING.md: on a TUSC
 * policy for what it scrutinises (UI.oversightOf), and on a TUSU policy for
 * what is scrutinising it (UI.scrutinisedBy).
 */
export function PolicyRelationLink({ policy, locale }: PolicyRelationLinkProps) {
  const href = localePath(locale, `/policy/${policy.slug.current}`);

  return (
    <div className="flex flex-col gap-[var(--space-1)] rounded-panel border border-line p-[var(--space-3)]">
      <div className="flex flex-wrap items-center gap-[var(--space-2)]">
        <Tag tone="governance">{UI[OWNER_LABEL_KEY[policy.owner]][locale]}</Tag>
        <StatusTag tone={STATUS_TONE[policy.status]} label={UI[STATUS_LABEL_KEY[policy.status]][locale]} />
      </div>
      <NextLink href={href} className="font-medium text-action underline">
        {pick(policy.title, locale)}
      </NextLink>
      {policy.summary ? <p className="m-0 text-sm text-ink-600">{pick(policy.summary, locale)}</p> : null}
    </div>
  );
}
