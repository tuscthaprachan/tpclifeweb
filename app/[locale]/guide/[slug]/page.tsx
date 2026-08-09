import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";

// The forms agent owns components/domain/form/** and exports FormCallout,
// which takes a resolved FormRecord and a headingLevel. getContentPageBySlug
// already resolves `relatedForms` to full records, so only the import is
// needed here.
import { FormCallout } from "@/components/domain/form";
import { PortableTextRenderer } from "@/components/domain/portable-text";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Heading, Link, NotificationBanner, Stack, Tag, Timestamp } from "@/components/ui";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getContentPageBySlug, getContentPages } from "@/lib/sanity/queries";
import type { ContentPage, FormRecord, SanityRef } from "@/lib/sanity/types";

const CATEGORY_LABEL = {
  transport: UI.categoryTransport,
  welfare: UI.categoryWelfare,
  activity: UI.categoryActivity,
  governance: UI.categoryGovernance,
};

const STALE_REVIEW_LABEL = { th: "หน้านี้ยังไม่ได้ตรวจสอบมานานกว่าหนึ่งปี", en: "This page has not been reviewed in over a year" }; // TODO: add to UI strings
const STALE_REVIEW_BODY = {
  th: "เนื้อหาบางส่วนอาจไม่เป็นปัจจุบัน โปรดตรวจสอบกับผู้รับผิดชอบก่อนใช้งาน",
  en: "Some details here may be out of date. Check with the responsible body before relying on them",
}; // TODO: add to UI strings
const STALE_AFTER_DAYS = 365;

function isStale(lastReviewed: string | undefined, now: Date): boolean {
  if (!lastReviewed) return true;
  const reviewedAt = new Date(lastReviewed).getTime();
  if (Number.isNaN(reviewedAt)) return true;
  return (now.getTime() - reviewedAt) / (1000 * 60 * 60 * 24) > STALE_AFTER_DAYS;
}

function isResolvedForm(form: FormRecord | SanityRef): form is FormRecord {
  return (form as { _type?: string })._type === "form";
}

function relatedPagePath(page: ContentPage): string {
  return page._type === "welfarePage" ? `/welfare/${page.slug.current}` : `/guide/${page.slug.current}`;
}

export async function generateStaticParams() {
  const pages = await getContentPages("guidePage");
  return LOCALES.flatMap((locale) => pages.map((page) => ({ locale, slug: page.slug.current })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const page = await getContentPageBySlug("guidePage", slug);
  if (!page) return {};

  return { title: pick(page.title, locale), description: pick(page.summary, locale) };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const page = await getContentPageBySlug("guidePage", slug);
  if (!page) notFound();

  const title = pick(page.title, locale);
  const now = new Date();
  const relatedForms = (page.relatedForms ?? []).filter(isResolvedForm);
  const relatedPages = (page.relatedPages ?? []).filter((related): related is ContentPage => "title" in related);

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.guide[locale], path: "/guide" },
          { label: title },
        ]}
      />
      <Stack space={6} className="py-[var(--space-8)]" as="section">
        <Stack space={2}>
          <Tag tone={page.category}>{CATEGORY_LABEL[page.category][locale]}</Tag>
          <Heading level={1}>{title}</Heading>
          <p className="m-0 text-ink-600">{pick(page.summary, locale)}</p>
          {page.lastReviewed ? (
            <p className="m-0 text-sm text-ink-600">
              {UI.lastReviewed[locale]}: <Timestamp value={page.lastReviewed} locale={locale} />
            </p>
          ) : null}
        </Stack>

        {isStale(page.lastReviewed, now) ? (
          <NotificationBanner variant="warning" title={STALE_REVIEW_LABEL[locale]}>
            {STALE_REVIEW_BODY[locale]}
          </NotificationBanner>
        ) : null}

        <PortableTextRenderer value={page.body[locale]} locale={locale} headingLevel={2} />

        {relatedForms.length > 0 ? (
          <Stack space={4}>
            {relatedForms.map((form) => (
              <FormCallout key={form._id} form={form} locale={locale} headingLevel={2} />
            ))}
          </Stack>
        ) : null}

        {page.relatedLinks && page.relatedLinks.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.relatedLinks[locale]}</Heading>
            <ul className="m-0 flex flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
              {page.relatedLinks.map((link) => (
                <li key={link._key ?? link.url}>
                  <Link href={link.url} locale={locale} className="font-medium text-action">
                    {pick(link.label, locale)}
                  </Link>
                  {link.requiresSignIn ? <span className="ml-[var(--space-2)] text-sm text-ink-600">({UI.requiresSignIn[locale]})</span> : null}
                </li>
              ))}
            </ul>
          </Stack>
        ) : null}

        {relatedPages.length > 0 ? (
          <Stack space={2} as="section">
            <Heading level={2}>{UI.relatedPages[locale]}</Heading>
            <ul className="m-0 flex flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
              {relatedPages.map((related) => (
                <li key={related._id}>
                  <NextLink href={localePath(locale, relatedPagePath(related))} className="font-medium text-action">
                    {pick(related.title, locale)}
                  </NextLink>
                </li>
              ))}
            </ul>
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
