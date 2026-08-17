/**
 * The confirmation page a successful report redirects to
 * (app/[locale]/lost-and-found/report/actions.ts's `redirect(receivedPath(...))`).
 * A separate route, not a re-render of the filled form: the instructions are
 * explicit that a successful submission must not re-render the form the
 * reporter just filled in.
 *
 * `ref` is absent when the submission was silently dropped as spam
 * (actions.ts's honeypot / minimum-time checks). No claim is made about a
 * report that was never written, so the reference line is skipped rather
 * than showing a fabricated code.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container, Panel, Stack } from "@/components/ui";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  return {
    title: UI.reportReceivedTitle[locale],
    // Every route declares its own reciprocal alternates. See the header of
    // lib/i18n/metadata.ts for why this cannot live in the layout, and
    // tests/a11y/structure.spec.ts, which fails the build on a route that
    // forgets it. This one did.
    alternates: alternatesFor(locale, "/lost-and-found/report/received"),
  };
}

export default async function LostFoundReportReceivedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const query = await searchParams;
  const reference = firstParam(query.ref);

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.lostAndFound[locale], path: "/lost-and-found" },
          { label: UI.reportReceivedTitle[locale] },
        ]}
      />
      <Stack space={6} className="py-[var(--space-8)]">
        <Panel headingLevel={1} title={UI.reportReceivedTitle[locale]} tone="success">
          <p className="m-0">{UI.reportReceivedBody[locale]}</p>
          {reference ? (
            <p className="m-0 mt-[var(--space-2)] text-lg font-semibold">
              {UI.lostFoundReference[locale]}: {reference}
            </p>
          ) : null}
        </Panel>
      </Stack>
    </Container>
  );
}
