/**
 * The single policy page: owner, status, the honest progress-or-latest-update,
 * staleness made visible, the oversight relationship rendered in both
 * directions (what this policy scrutinises, and what scrutinises it),
 * evidence links, and the full update history in reverse chronological order.
 *
 * The "scrutinised by" direction cannot come from `getPolicyBySlug` alone:
 * `Policy.oversightOf` only ever points forward, from a TUSC item to the TUSU
 * item it scrutinises, so the reverse has to be found by scanning every
 * policy for one whose `oversightOf` resolves back to this one. That is a
 * small, bounded scan (the whole policy set, fetched once from `getPolicies`),
 * not a second query type.
 */

import type { Metadata } from "next";
import { slugParams } from "@/lib/static-params";
import { notFound } from "next/navigation";
import { PolicyLastUpdated, PolicyProgress, PolicyRelationLink, PolicyUpdateList, STATUS_LABEL_KEY, STATUS_TONE, isResolvedPolicy } from "@/components/domain/policy";
import { OWNER_LABEL_KEY } from "@/components/domain/form";
import { RichText } from "@/components/domain/rich-text";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ShellContainer } from "@/components/layout/ShellContainer";
import { Heading } from "@/components/ui/Heading";
import { StatusTag } from "@/components/ui/StatusTag";
import { Stack } from "@/components/ui/Stack";
import { SummaryList, type SummaryListRow } from "@/components/ui/SummaryList";
import { Tag } from "@/components/ui/Tag";
import { Timestamp } from "@/components/ui/Timestamp";
import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getPolicies, getPolicyBySlug, resolveRichTextRefs } from "@/lib/content";

/*
 * Copy that lib/i18n/strings.ts does not carry, per CONTRIBUTING.md's
 * instruction for a missing shared string: hardcode both languages here
 * rather than invent a synonym from an existing key, and report the gap.
 */
// TODO: add to UI strings.
const POLICY_AREA_LABEL: LocaleString = { th: "ประเด็นนโยบาย", en: "Policy area" };
// TODO: add to UI strings.
const STARTED_LABEL: LocaleString = { th: "เริ่มดำเนินการ", en: "Started" };
// TODO: add to UI strings.
const TARGET_DATE_LABEL: LocaleString = { th: "กำหนดเป้าหมาย", en: "Target date" };
// TODO: add to UI strings.
const COMPLETED_LABEL: LocaleString = { th: "ดำเนินการเสร็จสิ้น", en: "Completed" };

export async function generateStaticParams() {
  const policies = await getPolicies();
  return slugParams(policies.map((policy) => policy.slug.current));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const policy = await getPolicyBySlug(slug);

  if (!policy) {
    return { title: UI.pageNotFoundTitle[locale] };
  }

  return {
    title: pick(policy.title, locale),
    description: pick(policy.summary, locale),
    alternates: {
      canonical: localePath(locale, `/policy/${slug}`),
      languages: {
        th: localePath("th", `/policy/${slug}`),
        en: localePath("en", `/policy/${slug}`),
        "x-default": localePath(DEFAULT_LOCALE, `/policy/${slug}`),
      },
    },
  };
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const policy = await getPolicyBySlug(slug);
  if (!policy) notFound();

  const title = pick(policy.title, locale);
  const areaLabel = pick(policy.policyArea, locale);
  const oversightTarget = isResolvedPolicy(policy.oversightOf) ? policy.oversightOf : null;

  // The reverse half of the oversight relationship: every policy in the
  // whole set whose own `oversightOf` resolves back to this one.
  const allPolicies = await getPolicies();
  const resolved = await resolveRichTextRefs([policy.detail?.[locale]]);
  const scrutinisedBy = allPolicies.filter((candidate) => {
    const target = isResolvedPolicy(candidate.oversightOf) ? candidate.oversightOf : null;
    return target !== null && target._id === policy._id;
  });

  const metaRows: SummaryListRow[] = [
    { key: UI.owner[locale], value: <Tag tone="governance">{UI[OWNER_LABEL_KEY[policy.owner]][locale]}</Tag> },
    { key: POLICY_AREA_LABEL[locale], value: areaLabel },
    { key: UI.status[locale], value: <StatusTag tone={STATUS_TONE[policy.status]} label={UI[STATUS_LABEL_KEY[policy.status]][locale]} /> },
  ];
  if (policy.startedAt) {
    metaRows.push({ key: STARTED_LABEL[locale], value: <Timestamp value={policy.startedAt} locale={locale} /> });
  }
  if (policy.targetDate) {
    metaRows.push({ key: TARGET_DATE_LABEL[locale], value: <Timestamp value={policy.targetDate} locale={locale} /> });
  }
  if (policy.completedAt) {
    metaRows.push({ key: COMPLETED_LABEL[locale], value: <Timestamp value={policy.completedAt} locale={locale} /> });
  }

  return (
    <ShellContainer className="pb-8 pt-2">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.policyTracker[locale], path: "/policy" },
          { label: title },
        ]}
      />

      <Stack space={8} className="max-w-[var(--width-narrow)]">
        <Stack space={2}>
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <Tag tone="governance">{UI[OWNER_LABEL_KEY[policy.owner]][locale]}</Tag>
            <StatusTag tone={STATUS_TONE[policy.status]} label={UI[STATUS_LABEL_KEY[policy.status]][locale]} />
          </div>
          <Heading level={1}>{title}</Heading>
          <p className="m-0 text-base text-ink-600">{pick(policy.summary, locale)}</p>
          {/* Honesty rule 2: staleness is shown unconditionally, regardless of whether PolicyProgress below is drawing a bar. */}
          <PolicyLastUpdated policy={policy} locale={locale} />
        </Stack>

        <PolicyProgress policy={policy} locale={locale} />

        <SummaryList rows={metaRows} />

        {policy.detail ? <RichText value={policy.detail[locale]} locale={locale} headingLevel={2} resolved={resolved} /> : null}

        {oversightTarget ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.oversightOf[locale]}</Heading>
            <PolicyRelationLink policy={oversightTarget} locale={locale} />
          </Stack>
        ) : null}

        {scrutinisedBy.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.scrutinisedBy[locale]}</Heading>
            <Stack space={2}>
              {scrutinisedBy.map((scrutiniser) => (
                <PolicyRelationLink key={scrutiniser._id} policy={scrutiniser} locale={locale} />
              ))}
            </Stack>
          </Stack>
        ) : null}

        {policy.evidenceLinks && policy.evidenceLinks.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.evidence[locale]}</Heading>
            <ul className="m-0 flex flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
              {policy.evidenceLinks.map((link) => {
                const external = isExternalUrl(link.url);
                return (
                  <li key={link._key ?? link.url}>
                    <a href={link.url} {...externalLinkProps(external)} className="font-medium text-action underline">
                      {pick(link.label, locale)}
                      {external ? <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span> : null}
                    </a>
                    {link.description ? <p className="m-0 text-sm text-ink-600">{pick(link.description, locale)}</p> : null}
                  </li>
                );
              })}
            </ul>
          </Stack>
        ) : null}

        <Stack space={2} as="section">
          <Heading level={2}>{UI.updateHistory[locale]}</Heading>
          <PolicyUpdateList updates={policy.updates ?? []} locale={locale} />
        </Stack>
      </Stack>
    </ShellContainer>
  );
}
