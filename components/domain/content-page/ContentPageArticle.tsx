import NextLink from "next/link";
import { Clock, ExternalLink } from "lucide-react";

import { FormCallout } from "@/components/domain/form";
import { RichText, richTextSections, type ResolvedRefs } from "@/components/domain/rich-text";
import { ArrowLeftIcon, ArrowRightIcon, Heading, IconText, IconTile, Link, NotificationBanner, Stack, TableOfContents, Tag, Timestamp } from "@/components/ui";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { ContentPage } from "@/lib/content/types";
import { isStale } from "./stale";
import { TopicTile } from "./TopicTile";
import { topicIcon } from "./topic-icons";

const CATEGORY_LABEL = {
  transport: UI.categoryTransport,
  welfare: UI.categoryWelfare,
  activity: UI.categoryActivity,
  governance: UI.categoryGovernance,
};

const ANCHOR_PREFIX = "section";
const MIN_TOC_SECTIONS = 3;

function relatedPagePath(page: ContentPage): string {
  return page._type === "guidePage" ? `/guide/${page.slug.current}` : `/welfare/${page.slug.current}`;
}

interface ContentPageArticleProps {
  page: ContentPage;
  locale: Locale;
  basePath: "/welfare" | "/guide";
  resolved: ResolvedRefs;
  staleLabel: string;
  staleBody: string;
  allTopicsLabel: string;
}

export function ContentPageArticle({ page, locale, basePath, resolved, staleLabel, staleBody, allTopicsLabel }: ContentPageArticleProps) {
  const full = page.body[locale];
  const leadNode = full?.content[0]?.type === "keyFacts" ? full.content[0] : undefined;
  const lead = leadNode ? { ...full!, content: [leadNode] } : undefined;
  const body = leadNode ? { ...full!, content: full!.content.slice(1) } : full;
  const sections = richTextSections(body, ANCHOR_PREFIX);
  const relatedForms = page.relatedForms ?? [];
  const relatedPages = page.relatedPages ?? [];
  const relatedLinks = page.relatedLinks ?? [];

  return (
    <Stack space={8} className="pb-[var(--space-12)] pt-[var(--space-2)]" as="section">
      <div className="grid gap-[var(--space-4)] sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-[var(--space-5)]">
        <TopicTile icon={topicIcon(page)} category={page.category} size="lg" />
        <Stack space={3}>
          <Tag tone={page.category} className="self-start">
            {CATEGORY_LABEL[page.category][locale]}
          </Tag>
          <Heading level={1} className="m-0">
            {pick(page.title, locale)}
          </Heading>
          <p className="m-0 text-lg text-ink-900" style={{ maxWidth: `var(--measure-${locale})` }}>
            {pick(page.summary, locale)}
          </p>
          {page.lastReviewed ? (
            <p className="m-0 text-sm text-ink-600">
              <IconText icon={Clock} className="items-center">
                {UI.lastReviewed[locale]}: <Timestamp value={page.lastReviewed} locale={locale} />
              </IconText>
            </p>
          ) : null}
        </Stack>
      </div>

      {isStale(page.lastReviewed, new Date()) ? (
        <NotificationBanner variant="warning" title={staleLabel}>
          {staleBody}
        </NotificationBanner>
      ) : null}

      {relatedLinks.length > 0 ? (
        <section aria-labelledby="page-links-heading" className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} id="page-links-heading" className="m-0 text-lg">
            {UI.relatedLinks[locale]}
          </Heading>
          <ul className="m-0 grid list-none gap-[var(--space-2)] p-0 sm:grid-cols-2">
            {relatedLinks.map((link) => (
              <li key={link._key ?? link.url} className="flex">
                <Link
                  href={link.url}
                  locale={locale}
                  className="press group flex min-h-14 w-full items-center gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt px-[var(--space-3)] py-[var(--space-2)] no-underline"
                >
                  <IconTile icon={ExternalLink} tone="soft" className="size-9" />
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug text-action group-hover:underline">{pick(link.label, locale)}</span>
                    {link.requiresSignIn ? <span className="block text-sm text-ink-600">{UI.requiresSignIn[locale]}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lead ? <RichText value={lead} locale={locale} headingLevel={2} resolved={resolved} /> : null}

      {sections.length >= MIN_TOC_SECTIONS ? (
        <TableOfContents
          locale={locale}
          headingLevel={2}
          id="page-toc"
          title={UI.odMpOnThisPage[locale]}
          items={sections.map((section) => ({ label: section.label, href: `#${section.id}` }))}
        />
      ) : null}

      <RichText
        value={body}
        locale={locale}
        headingLevel={2}
        resolved={resolved}
        anchorPrefix={ANCHOR_PREFIX}
        className="[&>h2:not(:first-child)]:border-t [&>h2:not(:first-child)]:border-line [&>h2:not(:first-child)]:pt-[var(--space-6)]"
      />

      {relatedForms.length > 0 ? (
        <Stack space={4}>
          {relatedForms.map((form) => (
            <FormCallout key={form._id} form={form} locale={locale} headingLevel={2} />
          ))}
        </Stack>
      ) : null}

      {relatedPages.length > 0 ? (
        <section aria-labelledby="page-related-heading" className="flex flex-col gap-[var(--space-3)] border-t border-line pt-[var(--space-6)]">
          <Heading level={2} id="page-related-heading" className="m-0 text-lg">
            {UI.relatedPages[locale]}
          </Heading>
          <ul className="m-0 grid list-none gap-[var(--space-2)] p-0">
            {relatedPages.map((related) => (
              <li key={related._id}>
                <NextLink
                  href={localePath(locale, relatedPagePath(related))}
                  className="press group grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt px-[var(--space-3)] py-[var(--space-2)] no-underline"
                >
                  <TopicTile icon={topicIcon(related)} category={related.category} />
                  <span className="font-semibold leading-snug text-action group-hover:underline">{pick(related.title, locale)}</span>
                  <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-action text-action-ink">
                    <ArrowRightIcon />
                  </span>
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <NextLink
        href={localePath(locale, basePath)}
        className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)] self-start font-semibold"
      >
        <ArrowLeftIcon />
        {allTopicsLabel}
      </NextLink>
    </Stack>
  );
}
