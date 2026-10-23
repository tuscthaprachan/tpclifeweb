import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NextLink from "next/link";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, EmptyState, Heading, Stack, StatusTag, Tag, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getContentPages } from "@/lib/content";
import { alternatesFor } from "@/lib/i18n/metadata";

const CATEGORY_LABEL = {
  transport: UI.categoryTransport,
  welfare: UI.categoryWelfare,
  activity: UI.categoryActivity,
  governance: UI.categoryGovernance,
};

// A page nobody has checked in over a year should look like one, per
// CONTRIBUTING.md. There is no shared UI string for this specific notice
// (only page-specific ones exist in lib/i18n/strings.ts), so it is hardcoded
// here and reported rather than invented as a synonym of something else.
const STALE_REVIEW_LABEL = { th: "ยังไม่ได้ตรวจสอบมานาน", en: "Not reviewed recently" }; // TODO: add to UI strings
const STALE_AFTER_DAYS = 365;

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
    alternates: alternatesFor(locale, "/welfare"), title: UI.welfare[locale] };
}

export default async function WelfareIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const pages = await getContentPages("welfarePage");
  const now = new Date();

  return (
    <Container width="narrow">
      <Breadcrumbs locale={locale} items={[{ label: UI.home[locale], path: "/" }, { label: UI.welfare[locale] }]} />
      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.welfare[locale]}</Heading>

        {pages.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {pages.map((page) => {
              const title = pick(page.title, locale);
              const stale = isStale(page.lastReviewed, now);
              return (
                <li key={page._id} className="py-[var(--space-4)]">
                  <Stack space={2}>
                    <Tag tone={page.category}>{CATEGORY_LABEL[page.category][locale]}</Tag>
                    <Heading level={2} className="m-0 text-lg">
                      <NextLink href={localePath(locale, `/welfare/${page.slug.current}`)} className="text-ink-900 no-underline hover:underline">
                        {title}
                      </NextLink>
                    </Heading>
                    <p className="m-0 text-ink-600">{pick(page.summary, locale)}</p>
                    <div className="flex flex-wrap items-center gap-[var(--space-2)] text-sm text-ink-600">
                      {page.lastReviewed ? (
                        <span>
                          {UI.lastReviewed[locale]}: <Timestamp value={page.lastReviewed} locale={locale} />
                        </span>
                      ) : null}
                      {stale ? <StatusTag tone="warning" label={STALE_REVIEW_LABEL[locale]} /> : null}
                    </div>
                  </Stack>
                </li>
              );
            })}
          </ul>
        )}
      </Stack>
    </Container>
  );
}
