import type { Metadata } from "next";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { PREVIEW_METADATA, isPreview } from "@/lib/preview/state";
import NextLink from "next/link";
import { slugParams } from "@/lib/static-params";
import { notFound } from "next/navigation";

// FormCallout takes a resolved FormRecord and a headingLevel.
// getContentPageBySlug already resolves `relatedForms` to full records, so only
// the import is needed here.
import { FormCallout } from "@/components/domain/form";
import { RichText, richTextSections } from "@/components/domain/rich-text";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Clock, ExternalLink } from "lucide-react";
import { ArrowLeftIcon, ArrowRightIcon, Container, Heading, IconText, IconTile, Link, NotificationBanner, Stack, Tag, TableOfContents, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getContentPageBySlug, getContentPagePreview, getContentPages, resolveRichTextRefs } from "@/lib/content";
import type { ContentPage } from "@/lib/content/types";
import { WELFARE_DETAIL_TEXT } from "./text";
import { welfareTopicIcon } from "../topic-icons";

const CATEGORY_LABEL = {
  transport: UI.categoryTransport,
  welfare: UI.categoryWelfare,
  activity: UI.categoryActivity,
  governance: UI.categoryGovernance,
};

const STALE_REVIEW_LABEL = WELFARE_DETAIL_TEXT.staleReviewLabel;
const STALE_REVIEW_BODY = WELFARE_DETAIL_TEXT.staleReviewBody;
const STALE_AFTER_DAYS = 365;
const ANCHOR_PREFIX = "section";
const MIN_TOC_SECTIONS = 3;

function isStale(lastReviewed: string | undefined, now: Date): boolean {
  if (!lastReviewed) return true;
  const reviewedAt = new Date(lastReviewed).getTime();
  if (Number.isNaN(reviewedAt)) return true;
  return (now.getTime() - reviewedAt) / (1000 * 60 * 60 * 24) > STALE_AFTER_DAYS;
}

function relatedPagePath(page: ContentPage): string {
  return page._type === "guidePage" ? `/guide/${page.slug.current}` : `/welfare/${page.slug.current}`;
}

export async function generateStaticParams() {
  const pages = await getContentPages("welfarePage");
  return slugParams(pages.map((page) => page.slug.current));
}

async function baseMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const page = await getContentPageBySlug("welfarePage", slug);
  if (!page) return {};

  return { title: pick(page.title, locale), description: pick(page.summary, locale) };
}

export async function generateMetadata(props: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const metadata = await baseMetadata(props);
  return (await isPreview()) ? { ...metadata, ...PREVIEW_METADATA } : metadata;
}

export default async function WelfareDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const preview = await isPreview();
  const page = preview ? await getContentPagePreview("welfarePage", slug) : await getContentPageBySlug("welfarePage", slug);
  if (!page) notFound();

  const title = pick(page.title, locale);
  const now = new Date();
  const relatedForms = page.relatedForms ?? [];
  const relatedPages = page.relatedPages ?? [];
  const relatedLinks = page.relatedLinks ?? [];
  const body = page.body[locale];
  const resolved = await resolveRichTextRefs([body]);
  const sections = richTextSections(body, ANCHOR_PREFIX);

  return (
    <Container width="narrow">
      {preview ? <PreviewBanner locale={locale} segment="welfare" id={page._id} /> : null}
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.welfare[locale], path: "/welfare" },
          { label: title },
        ]}
      />
      <Stack space={8} className="pb-[var(--space-12)] pt-[var(--space-2)]" as="section">
        <Stack space={3}>
          <Tag tone={page.category} className="self-start">{CATEGORY_LABEL[page.category][locale]}</Tag>
          <Heading level={1} className="m-0">{title}</Heading>
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

        {isStale(page.lastReviewed, now) ? (
          <NotificationBanner variant="warning" title={STALE_REVIEW_LABEL[locale]}>
            {STALE_REVIEW_BODY[locale]}
          </NotificationBanner>
        ) : null}

        {relatedLinks.length > 0 ? (
          <section aria-labelledby="welfare-links-heading" className="flex flex-col gap-[var(--space-3)]">
            <Heading level={2} id="welfare-links-heading" className="m-0 text-lg">
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

        {sections.length >= MIN_TOC_SECTIONS ? (
          <TableOfContents
            locale={locale}
            headingLevel={2}
            id="welfare-toc"
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
          <section aria-labelledby="welfare-related-heading" className="flex flex-col gap-[var(--space-3)] border-t border-line pt-[var(--space-6)]">
            <Heading level={2} id="welfare-related-heading" className="m-0 text-lg">
              {UI.relatedPages[locale]}
            </Heading>
            <ul className="m-0 grid list-none gap-[var(--space-2)] p-0">
              {relatedPages.map((related) => (
                <li key={related._id}>
                  <NextLink
                    href={localePath(locale, relatedPagePath(related))}
                    className="press group grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[var(--space-3)] rounded-[var(--radius-block)] bg-surface-alt px-[var(--space-3)] py-[var(--space-2)] no-underline"
                  >
                    <IconTile icon={welfareTopicIcon(related)} tone="soft" className="size-9" />
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
          href={localePath(locale, "/welfare")}
          className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)] self-start font-semibold"
        >
          <ArrowLeftIcon />
          {WELFARE_DETAIL_TEXT.allTopics[locale]}
        </NextLink>
      </Stack>
    </Container>
  );
}
