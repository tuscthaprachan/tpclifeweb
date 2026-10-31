import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  TUSC_PATH,
  Transcript,
  TuscShell,
  documentDate,
  documentPath,
  documentTitle,
  documentTypeLabel,
  driveFolderLabel,
  fillText,
  formatBytes,
  isPdf,
} from "@/components/domain/open-data";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { externalLinkProps, externalLinkSuffix, isExternalUrl } from "@/lib/a11y";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { detectLanguage } from "@/lib/open-data/markdown";
import { getOpenDataDocument, getOpenDataDocuments } from "@/lib/open-data/read";
import { slugParams } from "@/lib/static-params";

export async function generateStaticParams() {
  const documents = await getOpenDataDocuments();
  return slugParams(documents.map((doc) => doc.slug));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const doc = await getOpenDataDocument(slug);
  if (!doc) return {};
  return {
    alternates: alternatesFor(locale, documentPath(slug)),
    title: documentTitle(doc, locale),
    description: `${documentTypeLabel(doc.type, locale)}, ${documentDate(doc, locale)}`,
  };
}

export default async function TuscDocumentPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [doc, documents] = await Promise.all([getOpenDataDocument(slug), getOpenDataDocuments()]);
  if (!doc) notFound();

  const replaces = documents.filter((other) => other.replacedById === doc.id);
  const original = doc.fileUrl ?? doc.driveUrl;
  const external = isExternalUrl(original);
  const mirrored = doc.fileUrl !== null;
  const transcriptLanguage = detectLanguage(doc.transcriptMarkdown);

  const originalDetails = [
    mirrored ? (isPdf(doc) ? "PDF" : "") : "",
    mirrored ? formatBytes(doc.fileBytes, locale) : "",
    doc.pages === null ? "" : fillText(UI.odPagesCount[locale], { n: formatNumber(doc.pages, locale) }),
  ].filter(Boolean);

  const slugLink = (target: { slug: string; titleTh: string; titleEn: string }) => (
    <Link href={localePath(locale, documentPath(target.slug))} className="text-action underline">
      {documentTitle(target, locale)}
    </Link>
  );

  return (
    <TuscShell locale={locale} current="documents" trail={[{ label: fillText(UI.odFileNumber[locale], { n: doc.number }) }]}>
      <PageHead label={UI.odSourceDocument[locale]} title={documentTitle(doc, locale)} />
      <MetadataList
        items={[
          { term: UI.odMetaType[locale], value: documentTypeLabel(doc.type, locale) },
          { term: UI.odMetaIssuedBy[locale], value: (locale === "th" ? doc.issuerTh : doc.issuerEn) ?? doc.issuerTh ?? doc.issuerEn ?? UI.odNotStated[locale] },
          { term: UI.odMetaReference[locale], value: doc.reference ?? UI.odNotStated[locale] },
          { term: UI.odMetaDate[locale], value: documentDate(doc, locale) },
          { term: UI.odMetaSignedBy[locale], value: doc.signatory ?? UI.odNotStated[locale] },
          {
            term: UI.odMetaOriginalFile[locale],
            value: (
              <>
                <a href={original} {...externalLinkProps(external)} className="text-action underline">
                  {mirrored ? UI.odOnSiteFile[locale] : UI.odOriginalOnDrive[locale]}
                  {external ? <span className="visually-hidden">{externalLinkSuffix(locale, true)}</span> : null}
                </a>
                {originalDetails.length > 0 ? <> ({originalDetails.join(", ")})</> : null}
              </>
            ),
          },
          {
            term: UI.odMetaDriveFolder[locale],
            value: fillText(UI.odOriginalFileValue[locale], { n: doc.number, total: formatNumber(documents.length, locale), folder: driveFolderLabel(doc) }),
          },
          ...(doc.replacedBySlug
            ? [
                {
                  term: UI.odMetaReplacedBy[locale],
                  value: slugLink(documents.find((d) => d.slug === doc.replacedBySlug) ?? { slug: doc.replacedBySlug, titleTh: doc.replacedBySlug, titleEn: doc.replacedBySlug }),
                },
              ]
            : []),
          ...(replaces.length > 0 ? [{ term: UI.odMetaReplaces[locale], value: <>{replaces.map((other, index) => (<span key={other.id}>{index > 0 ? "; " : ""}{slugLink(other)}</span>))}</> }] : []),
        ]}
      />
      <Stack space={4}>
        <section aria-labelledby="od-text">
          <Heading level={2} id="od-text" className="m-0 mb-[var(--space-2)]">
            {UI.odFullText[locale]}
          </Heading>
          <p className="m-0 mb-[var(--space-5)] max-w-[var(--measure-en)] text-ink-900">
            {UI.odFullTextNote[locale]} {(transcriptLanguage === "th" ? UI.odFullTextNoteThai : UI.odFullTextNoteEnglish)[locale]}
          </p>
          {doc.transcriptMarkdown.trim() ? (
            <Transcript markdown={doc.transcriptMarkdown} locale={locale} headingLevel={3} />
          ) : (
            <p className="m-0">{UI.odNoTranscript[locale]}</p>
          )}
        </section>
        <p className="m-0">
          <Link href={localePath(locale, `${TUSC_PATH}/documents`)} className="inline-flex min-h-[var(--target-min)] items-center text-action underline">
            {UI.odAllDocuments[locale]}
          </Link>
        </p>
      </Stack>
    </TuscShell>
  );
}
