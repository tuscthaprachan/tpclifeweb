import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ArrowRightIcon, Container, EmptyState, IconTile, Stack, StatusTag, PageTitle, Heading } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { SourceDocumentLink } from "@/components/domain/open-data/SourceDocumentLink";
import { getContentPages } from "@/lib/content";
import { getOpenDataDocuments } from "@/lib/open-data/read";
import { alternatesFor } from "@/lib/i18n/metadata";
import { WELFARE_TEXT } from "./text";
import { welfareTopicIcon } from "./topic-icons";

const STALE_REVIEW_LABEL = WELFARE_TEXT.staleReviewLabel;
const STALE_AFTER_DAYS = 365;
const TOPICS_HEADING_ID = "welfare-topics-heading";

function isStale(lastReviewed: string | undefined, now: Date): boolean {
  if (!lastReviewed) return true;
  const reviewedAt = new Date(lastReviewed).getTime();
  if (Number.isNaN(reviewedAt)) return true;
  return (now.getTime() - reviewedAt) / (1000 * 60 * 60 * 24) > STALE_AFTER_DAYS;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/welfare"),
    title: UI.welfare[locale],
    description: WELFARE_TEXT.intro[locale],
  };
}

export default async function WelfareIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [pages, documents] = await Promise.all([getContentPages("welfarePage"), getOpenDataDocuments()]);
  const welfareGuide = documents.find((doc) => doc.number === "49");
  const now = new Date();

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.welfare[locale] }]} />
      <Stack space={8} className="pb-[var(--space-12)] pt-[var(--space-2)]">
        <Stack space={3}>
          <PageTitle path="/welfare">{UI.welfare[locale]}</PageTitle>
          <p className="m-0 text-lg text-ink-900" style={{ maxWidth: `var(--measure-${locale})` }}>
            {WELFARE_TEXT.intro[locale]}
          </p>
        </Stack>

        {pages.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          <section aria-labelledby={TOPICS_HEADING_ID}>
            <Heading level={2} id={TOPICS_HEADING_ID} className="visually-hidden">
              {WELFARE_TEXT.topicsHeading[locale]}
            </Heading>
            <ul className="m-0 grid list-none gap-[var(--space-3)] p-0">
              {pages.map((page) => {
                const stale = isStale(page.lastReviewed, now);
                return (
                  <li key={page._id} className="flex">
                    <NextLink
                      href={localePath(locale, `/welfare/${page.slug.current}`)}
                      className="press group grid w-full grid-cols-[auto_minmax(0,1fr)] content-start gap-x-[var(--space-3)] gap-y-[var(--space-2)] rounded-[var(--radius-block)] bg-surface-alt p-[var(--space-4)] no-underline"
                    >
                      <IconTile icon={welfareTopicIcon(page)} tone="soft" className="self-start" />
                      <span className="flex min-w-0 flex-col gap-[var(--space-1)]">
                        <span className="flex items-start justify-between gap-[var(--space-2)]">
                          <span className="text-[length:var(--text-lg)] font-bold leading-snug text-action group-hover:underline">
                            {pick(page.title, locale)}
                          </span>
                          <span aria-hidden="true" className="mt-[2px] grid size-7 shrink-0 place-items-center rounded-full bg-action text-action-ink">
                            <ArrowRightIcon />
                          </span>
                        </span>
                        <span className="text-[length:var(--text-sm)] leading-relaxed text-ink-600">{pick(page.summary, locale)}</span>
                        {stale ? (
                          <span className="mt-[var(--space-1)]">
                            <StatusTag tone="warning" label={STALE_REVIEW_LABEL[locale]} />
                          </span>
                        ) : null}
                      </span>
                    </NextLink>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {welfareGuide ? (
          <Stack space={2} className="border-t border-line pt-[var(--space-4)] text-sm text-ink-600">
            <SourceDocumentLink locale={locale} document={welfareGuide} />
            <SourceDocumentLink locale={locale} funds />
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
