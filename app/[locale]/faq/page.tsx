import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PortableTextRenderer } from "@/components/domain/portable-text";
import { Container, Details, EmptyState, Heading, Stack, Tag } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { getFaqs } from "@/lib/sanity/queries";
import type { Category, Faq } from "@/lib/sanity/types";
import { alternatesFor } from "@/lib/i18n/metadata";

/**
 * Common questions, re-authored from the TU91 handbook's Q and A section.
 *
 * This page exists for two reasons. The obvious one is that the handbook's
 * questions are the ones students actually ask, and they are currently locked
 * inside scanned images with no text layer, which fails 1.1.1 and 1.4.5 and
 * cannot be searched.
 *
 * The less obvious one: the search index builds FAQ results as `/faq#{id}`.
 * Without this page every FAQ hit in search would land on a 404, so the answers
 * would be indexed and unreachable at the same time.
 *
 * Answers use native `<details>` rather than a JavaScript accordion, so every
 * answer is reachable, expandable and findable with browser find-in-page even
 * with JavaScript off.
 */

const CATEGORY_LABEL: Record<Category, { th: string; en: string }> = {
  transport: UI.categoryTransport,
  welfare: UI.categoryWelfare,
  activity: UI.categoryActivity,
  governance: UI.categoryGovernance,
};

const CATEGORY_TONE: Record<Category, "transport" | "welfare" | "activity" | "governance"> = {
  transport: "transport",
  welfare: "welfare",
  activity: "activity",
  governance: "governance",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    alternates: alternatesFor(locale, "/faq"), title: UI.faq[locale] };
}

/** Groups by category so a reader can scan to the area they care about. */
function groupByCategory(faqs: Faq[]): Array<{ category: Category; items: Faq[] }> {
  const order: Category[] = ["transport", "welfare", "activity", "governance"];
  return order
    .map((category) => ({ category, items: faqs.filter((f) => f.category === category) }))
    .filter((group) => group.items.length > 0);
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const faqs = await getFaqs();
  const groups = groupByCategory(faqs);

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[{ label: UI.home[locale], path: "/" }, { label: UI.faq[locale] }]}
      />

      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]">
        <Heading level={1}>{UI.faq[locale]}</Heading>

        {groups.length === 0 ? (
          <EmptyState title={UI.nothingHere[locale]} />
        ) : (
          groups.map((group) => (
            <Stack key={group.category} space={4}>
              <Heading level={2}>
                <Tag tone={CATEGORY_TONE[group.category]}>
                  {CATEGORY_LABEL[group.category][locale]}
                </Tag>
              </Heading>

              <Stack space={2}>
                {group.items.map((faq) => (
                  /*
                   * The id is what the search index anchors to. It is the
                   * document id rather than a slug because `Faq` has no slug
                   * field in the content model.
                   */
                  <div key={faq._id} id={faq._id} className="scroll-mt-[var(--header-height,4rem)]">
                    <Details summary={pick(faq.question, locale)}>
                      <PortableTextRenderer
                        value={faq.answer[locale]}
                        locale={locale}
                        headingLevel={3}
                      />
                    </Details>
                  </div>
                ))}
              </Stack>
            </Stack>
          ))
        )}
      </Stack>
    </Container>
  );
}
