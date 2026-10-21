/**
 * About TUSC Tha Prachan: role, when it was founded, how it relates to TUSU,
 * and a link into the policy dashboard filtered to its own items. Every fact
 * here comes from `data/harvested-inventory.ts` (`STUDENT_BODIES`), per this
 * agent's brief: no invented history, office holders or achievements.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { STUDENT_BODIES, SOURCE_DOCUMENTS } from "@/data/harvested-inventory";
import { externalLinkProps, externalLinkSuffix } from "@/lib/a11y";
import { DEFAULT_LOCALE, LOCALES, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { alternatesFor } from "@/lib/i18n/metadata";
import {
  CAMPUS_REFORM_LABEL,
  CAMPUS_REFORM_TEXT,
  ESTABLISHED_LABEL,
  GOVERNED_BY_LABEL,
  HOW_THEY_RELATE_LABEL,
  READ_REGULATION_LABEL,
  RELATION_TEXT,
  ROLE_LABEL,
  VIEW_TUSC_POLICIES_LABEL,
  establishedYearLabel,
} from "../copy";

const REGULATION = SOURCE_DOCUMENTS.find((document) => document.key === "studentActivityRegulation");

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return {
    alternates: alternatesFor(locale, "/about/tusc"),
    title: STUDENT_BODIES.tusc.name[locale],
    description: STUDENT_BODIES.tusc.role[locale],
  };
}

export default async function AboutTuscPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const body = STUDENT_BODIES.tusc;

  return (
    <Container width="narrow">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: UI.home[locale], path: "/" },
          { label: UI.about[locale], path: "/about" },
          { label: body.name[locale] },
        ]}
      />

      <Stack space={8} className="pb-[var(--space-8)] pt-[var(--space-2)]" as="section">
        <Stack space={2}>
          <Heading level={1}>{body.name[locale]}</Heading>
          <p className="m-0 text-ink-600">
            {ESTABLISHED_LABEL[locale]}: {establishedYearLabel(body.established, locale)}
          </p>
        </Stack>

        <Stack space={2}>
          <Heading level={2}>{ROLE_LABEL[locale]}</Heading>
          <p className="m-0 text-ink-900">{body.role[locale]}</p>
        </Stack>

        <Stack space={2}>
          <Heading level={2}>{HOW_THEY_RELATE_LABEL[locale]}</Heading>
          <p className="m-0 text-ink-900">{RELATION_TEXT[locale]}</p>
        </Stack>

        <Stack space={2}>
          <Heading level={2}>{GOVERNED_BY_LABEL[locale]}</Heading>
          <p className="m-0 text-ink-900">{STUDENT_BODIES.governedBy[locale]}</p>
          {REGULATION ? (
            <p className="m-0">
              <a href={REGULATION.url} {...externalLinkProps(true)} className="font-medium text-action underline">
                {READ_REGULATION_LABEL[locale]}
                <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span>
              </a>
            </p>
          ) : null}
        </Stack>

        <Stack space={2}>
          <Heading level={2}>{CAMPUS_REFORM_LABEL[locale]}</Heading>
          <p className="m-0 text-ink-900">{CAMPUS_REFORM_TEXT[locale]}</p>
        </Stack>

        <div>
          <Button href={localePath(locale, "/policy?owner=tusc")}>{VIEW_TUSC_POLICIES_LABEL[locale]}</Button>
        </div>
      </Stack>
    </Container>
  );
}
