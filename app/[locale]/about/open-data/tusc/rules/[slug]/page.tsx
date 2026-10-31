import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChapterContents,
  MetadataList,
  OPERATION_RULE_MEANINGS,
  OPERATION_RULE_NUMBER,
  OPERATION_TRANSLATION_NUMBER,
  PageHead,
  RULE_DESCRIPTION,
  RULE_NUMBERS,
  Transcript,
  TuscShell,
  documentPath,
  documentTitle,
  documentTypeLabel,
  fillText,
  formatBytes,
  isPdf,
  ruleContents,
  ruleDate,
  rulePath,
  ruleStatus,
  ruleStatusLabel,
} from "@/components/domain/open-data";
import { Heading } from "@/components/ui/Heading";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { Stack } from "@/components/ui/Stack";
import { StatusTag } from "@/components/ui/StatusTag";
import { TableOfContents, type TableOfContentsItem } from "@/components/ui/TableOfContents";
import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDocument, getOpenDataDocuments, type DocumentSummary } from "@/lib/open-data/read";
import { slugParams } from "@/lib/static-params";

export async function generateStaticParams() {
  const documents = await getOpenDataDocuments();
  return slugParams(documents.filter((doc) => RULE_NUMBERS.includes(doc.number)).map((doc) => doc.slug));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const doc = await getOpenDataDocument(slug);
  if (!doc || !RULE_NUMBERS.includes(doc.number)) return {};
  return {
    alternates: alternatesFor(locale, rulePath(slug)),
    title: documentTitle(doc, locale),
    description: (doc.number === OPERATION_RULE_NUMBER ? UI.odRlSummary26 : RULE_DESCRIPTION[doc.number])?.[locale],
  };
}

function OriginalFile({ doc, label, note, locale }: { doc: DocumentSummary; label: string; note: string; locale: Locale }) {
  const href = doc.fileUrl ?? doc.driveUrl;
  const external = isExternalUrl(href);
  const details = [
    isPdf(doc) ? "PDF" : "",
    doc.fileUrl ? formatBytes(doc.fileBytes, locale) : "",
    doc.pages === null ? "" : fillText(UI.odPagesCount[locale], { n: formatNumber(doc.pages, locale) }),
  ].filter(Boolean);
  return (
    <li className="border-t border-line py-[var(--space-3)] last:border-b">
      <Heading level={3} className="m-0 mb-[var(--space-1)] text-lg">
        <a href={href} {...externalLinkProps(external)} className="text-action underline hover:text-action-hover">
          {label}
          {external ? <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span> : null}
        </a>
      </Heading>
      <ul className="m-0 mb-[var(--space-1)] flex list-none flex-wrap gap-x-[var(--space-5)] p-0 text-sm text-ink-600">
        <li>{note}</li>
        <li>{ruleDate(doc, locale)}</li>
        <li>{details.join(", ")}</li>
      </ul>
      <Link href={localePath(locale, documentPath(doc.slug))} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
        {fillText(UI.odRlSourcePage[locale], { n: doc.number })}
      </Link>
    </li>
  );
}

export default async function TuscRulePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [doc, documents] = await Promise.all([getOpenDataDocument(slug), getOpenDataDocuments()]);
  if (!doc || !RULE_NUMBERS.includes(doc.number)) notFound();

  const isOperation = doc.number === OPERATION_RULE_NUMBER;
  const translationSummary = isOperation ? documents.find((other) => other.number === OPERATION_TRANSLATION_NUMBER) : undefined;
  const translation = translationSummary && locale === "en" ? await getOpenDataDocument(translationSummary.slug) : null;
  const showTranslation = isOperation && locale === "en" && translation !== null && translation.transcriptMarkdown.trim() !== "";
  const markdown = showTranslation ? translation.transcriptMarkdown : doc.transcriptMarkdown;
  const hasText = markdown.trim() !== "";
  const contents = ruleContents(markdown);
  const showContents = contents.entries.length > 1;

  const replaces = documents.filter((other) => other.replacedById === doc.id);
  const replacedBy = doc.replacedBySlug ? documents.find((other) => other.slug === doc.replacedBySlug) : undefined;
  const status = ruleStatus(doc);
  const summary = (isOperation ? UI.odRlSummary26 : RULE_DESCRIPTION[doc.number])?.[locale];
  const pages = (value: number | null) => (value === null ? "" : formatNumber(value, locale));

  const ruleLink = (target: { slug: string; titleTh: string; titleEn: string }) => (
    <Link href={localePath(locale, documentPath(target.slug))} className="text-action underline">
      {documentTitle(target, locale)}
    </Link>
  );

  const clauseLink = (n: number) => (
    <a href={`#clause-${n}`} className="text-action underline">
      {fillText(UI.odRlClause[locale], { n: formatNumber(n, locale) })}
    </a>
  );

  const meta = [
    { term: UI.odMetaIssuedBy[locale], value: (locale === "th" ? doc.issuerTh : doc.issuerEn) ?? doc.issuerTh ?? doc.issuerEn ?? UI.odNotStated[locale] },
    ...(doc.signatory ? [{ term: UI.odMetaSignedBy[locale], value: <span lang="th">{doc.signatory}</span> }] : []),
    { term: UI.odRlMetaDate[locale], value: ruleDate(doc, locale) },
    ...(isOperation ? [{ term: UI.odRlMetaMadeUnder[locale], value: UI.odRlMadeUnderValue[locale] }] : []),
    {
      term: UI.odRlMetaStatus[locale],
      value: (
        <>
          <StatusTag tone={status === "replaced" ? "neutral" : "success"} label={ruleStatusLabel(status)[locale]} />
          {isOperation ? <> {UI.odRlStatusApplies[locale]}</> : null}
        </>
      ),
    },
    ...(isOperation && replaces.length === 0 ? [{ term: UI.odMetaReplaces[locale], value: UI.odRlReplacesNone[locale] }] : []),
    ...(replaces.length > 0
      ? [{ term: UI.odMetaReplaces[locale], value: <>{replaces.map((other, index) => (<span key={other.id}>{index > 0 ? "; " : ""}{ruleLink(other)}</span>))}</> }]
      : []),
    ...(replacedBy ? [{ term: UI.odMetaReplacedBy[locale], value: ruleLink(replacedBy) }] : []),
    {
      term: UI.odRlMetaLength[locale],
      value: isOperation
        ? fillText(UI.odRlLength26[locale], { pages: pages(doc.pages) })
        : doc.pages === null
          ? UI.odNotStated[locale]
          : fillText(UI.odPagesCount[locale], { n: pages(doc.pages) }),
    },
    ...(isOperation && translationSummary
      ? [{ term: UI.odRlMetaTranslation[locale], value: fillText(UI.odRlTranslation26[locale], { pages: pages(translationSummary.pages) }) }]
      : []),
  ];

  const tocItems: TableOfContentsItem[] = [
    ...(isOperation ? [{ label: UI.odRlMeansHeading[locale], href: "#od-rule-means" }] : []),
    ...(hasText ? [{ label: UI.odFullText[locale], href: "#od-rule-text" }] : []),
    { label: UI.odRlOriginalHeading[locale], href: "#od-rule-original" },
  ];

  const originals: { doc: DocumentSummary; label: string; note: string }[] = [
    {
      doc,
      label: isOperation ? UI.odRlOriginalThai[locale] : documentTitle(doc, locale),
      note: isOperation ? UI.odRlOriginalRegulation[locale] : documentTypeLabel(doc.type, locale),
    },
    ...(translationSummary
      ? [{ doc: translationSummary, label: UI.odRlOriginalTranslation[locale], note: UI.odRlTranslationNotLegal[locale] }]
      : []),
  ];
  const onDrive = originals.some((item) => !item.doc.fileUrl);

  return (
    <TuscShell locale={locale} current="rules" trail={[{ label: fillText(UI.odFileNumber[locale], { n: doc.number }) }]}>
      <PageHead label={UI.odRlLabel[locale]} title={documentTitle(doc, locale)} summary={summary} />
      <MetadataList items={meta} />
      <Stack space={8}>
        <TableOfContents items={tocItems} locale={locale} headingLevel={2} id="od-rule-toc" title={UI.odRlOnThisPage[locale]} />

        {isOperation ? (
          <section aria-labelledby="od-rule-means">
            <Heading level={2} id="od-rule-means" className="m-0 mb-[var(--space-3)]">
              {UI.odRlMeansHeading[locale]}
            </Heading>
            <ul className="m-0 mb-[var(--space-3)] flex max-w-[var(--measure-en)] list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
              {OPERATION_RULE_MEANINGS.map((point) => (
                <li key={point.clause}>
                  {point.text[locale]} ({clauseLink(point.clause)})
                </li>
              ))}
            </ul>
            <p className="m-0 max-w-[var(--measure-en)] text-ink-900">{UI.odRlMeansNote[locale]}</p>
          </section>
        ) : null}

        {hasText ? (
          <section aria-labelledby="od-rule-text">
            <Heading level={2} id="od-rule-text" className="m-0 mb-[var(--space-2)]">
              {UI.odFullText[locale]}
            </Heading>
            <p className="m-0 mb-[var(--space-5)] max-w-[var(--measure-en)] text-ink-900">
              {isOperation ? (
                showTranslation ? (
                  <>
                    {UI.odRlLegalEnBefore[locale]}
                    {clauseLink(119)}
                    {UI.odRlLegalEnAfter[locale]}
                  </>
                ) : (
                  <>
                    {UI.odRlLegalThaiBefore[locale]}
                    {clauseLink(119)}
                    {UI.odRlLegalThaiAfter[locale]}
                  </>
                )
              ) : (
                UI.odRlTextAsIssued[locale]
              )}
            </p>
            <Stack space={6}>
              {showContents ? (
                <ChapterContents
                  contents={contents}
                  locale={locale}
                  headingLevel={3}
                  id="od-rule-contents"
                  title={UI.odRlContentsTitle[locale]}
                  introLabel={UI.odRlIntroClauses[locale]}
                />
              ) : null}
              <Transcript markdown={contents.markdown} locale={locale} headingLevel={3} />
            </Stack>
          </section>
        ) : null}

        <section aria-labelledby="od-rule-original">
          <Heading level={2} id="od-rule-original" className="m-0 mb-[var(--space-3)]">
            {UI.odRlOriginalHeading[locale]}
          </Heading>
          <ul className="m-0 list-none p-0">
            {originals.map((item) => (
              <OriginalFile key={item.doc.id} doc={item.doc} label={item.label} note={item.note} locale={locale} />
            ))}
          </ul>
          {onDrive ? <p className="m-0 mt-[var(--space-3)] text-sm text-ink-600">{UI.odRlDriveNote[locale]}</p> : null}
        </section>

        <RelatedLinks
          locale={locale}
          headingLevel={2}
          id="od-rule-related"
          items={[
            { label: UI.odRlRelAll[locale], href: localePath(locale, "/about/open-data/tusc/rules") },
            { label: UI.odRlRelMeetings[locale], href: localePath(locale, "/about/open-data/tusc/meetings"), description: UI.odRlRelMeetingsDesc[locale] },
            { label: UI.odRlRelDecisions[locale], href: localePath(locale, "/about/open-data/tusc/decisions") },
          ]}
        />
      </Stack>
    </TuscShell>
  );
}
