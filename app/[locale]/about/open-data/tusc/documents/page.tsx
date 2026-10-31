import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  MetadataList,
  PageHead,
  TUSC_PATH,
  TuscShell,
  documentListItem,
  fillText,
  groupDocuments,
} from "@/components/domain/open-data";
import { DocumentList } from "@/components/ui/DocumentList";
import { Heading } from "@/components/ui/Heading";
import { Stack } from "@/components/ui/Stack";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { getOpenDataDocuments } from "@/lib/open-data/read";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const documents = await getOpenDataDocuments();
  return {
    alternates: alternatesFor(locale, `${TUSC_PATH}/documents`),
    title: `${UI.odNavDocuments[locale]} | ${UI.odTuscShort[locale]}`,
    description: fillText(UI.odDocumentsSummary[locale], { n: formatNumber(documents.length, locale) }),
  };
}

export default async function TuscDocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const documents = await getOpenDataDocuments();
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const groups = groupDocuments(documents, locale);
  const n = formatNumber(documents.length, locale);
  const scans = documents.filter((doc) => doc.scan).length;
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);

  return (
    <TuscShell locale={locale} current="documents">
      <PageHead
        label={UI.odOpenData[locale]}
        title={UI.odNavDocuments[locale]}
        summary={fillText(UI.odDocumentsSummary[locale], { n })}
      />
      <MetadataList
        items={[
          { term: UI.odPublishedBy[locale], value: UI.odTuscFull[locale] },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
          { term: UI.odOrigin[locale], value: fillText(UI.odOriginValue[locale], { n }) },
          { term: UI.odTranscribed[locale], value: fillText(UI.odTranscribedValue[locale], { n, scans: formatNumber(scans, locale) }) },
        ]}
      />
      {groups.length > 0 ? (
        <Stack space={8}>
          <div>
            <TableOfContents
              locale={locale}
              headingLevel={2}
              title={UI.odDriveFolders[locale]}
              items={groups.map((group) => ({
                label: `${group.title} (${formatNumber(group.count, locale)})`,
                href: `#${group.id}`,
              }))}
            />
            <p className="m-0 mt-[var(--space-3)] max-w-[var(--measure-en)] text-ink-600">{UI.odFolderNote[locale]}</p>
          </div>
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={group.id}>
              <Heading level={2} id={group.id} className="m-0 mb-[var(--space-3)]">
                {group.title}
                {locale === "en" && group.driveName ? (
                  <>
                    {" "}
                    <span lang="th">({group.driveName})</span>
                  </>
                ) : null}{" "}
                <span className="font-normal text-ink-600">({formatNumber(group.count, locale)})</span>
              </Heading>
              <Stack space={6}>
                {group.sections.map((section) => (
                  <div key={section.key}>
                    {section.heading ? (
                      <Heading level={3} className="m-0 mb-[var(--space-2)] text-lg">
                        {section.heading}
                      </Heading>
                    ) : null}
                    <DocumentList
                      locale={locale}
                      headingLevel={section.heading ? 4 : 3}
                      items={section.docs.map((doc) => documentListItem(doc, locale, byId))}
                    />
                  </div>
                ))}
              </Stack>
            </section>
          ))}
        </Stack>
      ) : null}
    </TuscShell>
  );
}
