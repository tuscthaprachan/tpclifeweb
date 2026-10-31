import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetadataList, PageHead, TUSC_PATH, TuscShell, documentListItem, documentPath, documentTitle, fillText } from "@/components/domain/open-data";
import {
  BodyLink,
  BodyStatus,
  COUNCIL_SLUG,
  DateOrNotStated,
  NotStated,
  SourceLinks,
  TextOf,
  ThaiName,
  bodiesWithMembers,
  bodyName,
  bodyTypeLabel,
  citedDocuments,
  facultyLabel,
  membershipsOfBody,
  periodText,
  printedOrNull,
  roleLabel,
} from "@/components/domain/open-data/people";
import { CiteThis } from "@/components/ui/CiteThis";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DocumentList } from "@/components/ui/DocumentList";
import { Heading } from "@/components/ui/Heading";
import { RelatedLinks } from "@/components/ui/RelatedLinks";
import { Stack } from "@/components/ui/Stack";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { alternatesFor } from "@/lib/i18n/metadata";
import { UI } from "@/lib/i18n/strings";
import { slugParams } from "@/lib/static-params";
import {
  getOpenDataBodies,
  getOpenDataDocuments,
  getOpenDataMemberships,
  type MembershipRow,
} from "@/lib/open-data/read";

type Params = { locale: string; slug: string };

export async function generateStaticParams() {
  const [bodies, memberships] = await Promise.all([getOpenDataBodies(), getOpenDataMemberships()]);
  return slugParams(bodiesWithMembers(bodies, memberships).map((body) => body.slug));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const [bodies, memberships] = await Promise.all([getOpenDataBodies(), getOpenDataMemberships()]);
  const body = bodies.find((b) => b.slug === slug);
  if (!body || !memberships.some((m) => m.bodySlug === slug)) return {};
  const named = memberships.filter((m) => m.bodySlug === slug).length;
  return {
    alternates: alternatesFor(locale, `${TUSC_PATH}/committees/${slug}`),
    title: `${bodyName(body, locale).text} | ${UI.odTuscShort[locale]}`,
    description: fillText(UI.odCommitteeSummary[locale], {
      name: bodyName(body, locale).text,
      type: bodyTypeLabel(body, locale),
      n: formatNumber(named, locale),
    }),
  };
}

export default async function TuscCommitteePage({ params }: { params: Promise<Params> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;

  const [bodies, memberships, documents] = await Promise.all([getOpenDataBodies(), getOpenDataMemberships(), getOpenDataDocuments()]);
  const body = bodies.find((b) => b.slug === slug);
  const members = membershipsOfBody(memberships, slug);
  if (!body || members.length === 0) notFound();

  const n = (value: number) => formatNumber(value, locale);
  const byNumber = new Map(documents.map((doc) => [doc.number, doc]));
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const bySlug = new Map(documents.map((doc) => [doc.slug, doc]));
  const name = bodyName(body, locale);
  const type = bodyTypeLabel(body, locale);
  const children = bodiesWithMembers(bodies, memberships).filter((b) => b.parentSlug === slug);
  const parent = body.parentSlug && body.parentSlug !== COUNCIL_SLUG ? bodies.find((b) => b.slug === body.parentSlug) : undefined;
  const chair = printedOrNull(body.chair);
  const remit = printedOrNull(body.remit);
  const legal = printedOrNull(body.legalBasis);
  const appointing = body.sourceDocumentSlug ? bySlug.get(body.sourceDocumentSlug) : undefined;
  const cited = citedDocuments([...members, ...(appointing ? [{ sourceDocuments: null, sourceDocumentSlug: appointing.slug }] : [])], documents);
  const updated = documents.reduce<string | null>((latest, doc) => (latest === null || doc.updatedAt > latest ? doc.updatedAt : latest), null);
  const dated = members.some((m) => m.fromDate || m.toDate);
  const childCount = (child: { slug: string }) => memberships.filter((m) => m.bodySlug === child.slug).length;

  const columns: DataTableColumn<MembershipRow>[] = [
    { id: "name", header: UI.odColName[locale], rowHeader: true, cell: (m) => <ThaiName name={m.personNameTh} /> },
    { id: "post", header: UI.odColPost[locale], cell: (m) => <TextOf label={roleLabel(m.roleTh, locale, slug)} /> },
    { id: "party", header: UI.odColParty[locale], cell: (m) => printedOrNull(m.party) ?? <NotStated locale={locale} /> },
    {
      id: "faculty",
      header: UI.odColFaculty[locale],
      cell: (m) => {
        const label = facultyLabel(m.faculty, locale);
        return label ? <TextOf label={label} /> : <NotStated locale={locale} />;
      },
    },
    ...(dated
      ? [
          {
            id: "dates",
            header: `${UI.odColFrom[locale]} / ${UI.odColTo[locale]}`,
            cell: (m: MembershipRow) => periodText(m.fromDate, m.toDate, locale) || <NotStated locale={locale} />,
          },
        ]
      : []),
    { id: "source", header: UI.odColSource[locale], cell: (m) => <SourceLinks row={m} documents={byNumber} locale={locale} /> },
  ];

  const toc = [
    ...(remit || legal ? [{ label: UI.odCommitteeRemit[locale], href: "#remit" }] : []),
    { label: UI.odCommitteeMembers[locale], href: "#members" },
    ...(children.length > 0 ? [{ label: UI.odCommitteeSubs[locale], href: "#sub" }] : []),
    ...(cited.length > 0 ? [{ label: UI.odCommitteeDocs[locale], href: "#docs" }] : []),
  ];

  const memberCount = body.membersAsAppointed;
  const label = body.kind === "office" ? UI.odBodyOffice[locale] : UI.odBodyCommittee[locale];
  const title = <TextOf label={name} />;

  return (
    <TuscShell locale={locale} current="committees" trail={[{ label: name.text }]}>
      <PageHead
        label={label}
        title={title}
        summary={fillText(UI.odCommitteeSummary[locale], { name: name.text, type, n: n(members.length) })}
      />
      <MetadataList
        items={[
          { term: UI.odColType[locale], value: type },
          ...(parent ? [{ term: UI.odMetaPartOf[locale], value: <BodyLink body={parent} locale={locale} /> }] : []),
          { term: UI.odColChair[locale], value: chair ? <ThaiName name={chair} /> : <NotStated locale={locale} /> },
          {
            term: UI.odColMembers[locale],
            value:
              memberCount === null
                ? fillText(UI.odMembersValue[locale], { appointed: UI.odNotStated[locale], named: n(members.length) })
                : fillText(UI.odMembersValue[locale], { appointed: n(memberCount), named: n(members.length) }),
          },
          { term: UI.odMetaAppointedOn[locale], value: <DateOrNotStated iso={body.appointedOn} locale={locale} /> },
          ...(body.endedOn ? [{ term: UI.odMetaEndedOn[locale], value: formatDate(body.endedOn, locale) }] : []),
          ...(appointing
            ? [
                {
                  term: UI.odMetaAppointingDocument[locale],
                  value: (
                    <Link href={localePath(locale, documentPath(appointing.slug))} className="text-action underline hover:text-action-hover">
                      {documentTitle(appointing, locale)}
                    </Link>
                  ),
                },
              ]
            : []),
          { term: UI.odColStatus[locale], value: <BodyStatus activity={body.activity} locale={locale} /> },
          { term: UI.odLastUpdated[locale], value: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale] },
        ]}
      />
      <Stack space={8}>
        <TableOfContents locale={locale} headingLevel={2} items={toc} />

        {remit || legal ? (
          <section aria-labelledby="remit">
            <Heading level={2} id="remit" className="m-0 mb-[var(--space-3)]">
              {UI.odCommitteeRemit[locale]}
            </Heading>
            {remit ? (
              <p className="m-0 max-w-[var(--measure-en)]" lang="en">
                {remit}
              </p>
            ) : null}
            {legal ? (
              <>
                <Heading level={3} className="m-0 mb-[var(--space-2)] mt-[var(--space-4)] text-lg">
                  {UI.odCommitteeLegal[locale]}
                </Heading>
                <p className="m-0 max-w-[var(--measure-en)]" lang="en">
                  {legal}
                </p>
              </>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="members">
          <Heading level={2} id="members" className="m-0 mb-[var(--space-3)]">
            {UI.odCommitteeMembers[locale]}
          </Heading>
          <DataTable
            id="t-members"
            locale={locale}
            caption={`${fillText(UI.odTableLabel[locale], { n: 1 })}: ${fillText(UI.odCapMembers[locale], { name: name.text })}`}
            columns={columns}
            rows={members}
            getRowKey={(m) => `${m.personId}-${m.roleTh}-${m.fromDate ?? ""}`}
            sourceNote={UI.odNotStatedNote[locale]}
          />
        </section>

        {children.length > 0 ? (
          <section aria-labelledby="sub">
            <Heading level={2} id="sub" className="m-0 mb-[var(--space-3)]">
              {UI.odCommitteeSubs[locale]}
            </Heading>
            <ul className="m-0 flex list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">
              {children.map((child) => (
                <li key={child.slug}>
                  <BodyLink body={child} locale={locale} /> ({n(childCount(child))})
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cited.length > 0 ? (
          <section aria-labelledby="docs">
            <Heading level={2} id="docs" className="m-0 mb-[var(--space-3)]">
              {UI.odCommitteeDocs[locale]}
            </Heading>
            <DocumentList locale={locale} headingLevel={3} items={cited.map((doc) => documentListItem(doc, locale, byId))} />
          </section>
        ) : null}

        <CiteThis locale={locale} headingLevel={2}>
          {fillText(UI.odCiteBody[locale], {
            title: name.text,
            date: updated ? formatDate(updated, locale) : UI.odNotApplicable[locale],
          })}
        </CiteThis>
        <RelatedLinks
          locale={locale}
          headingLevel={2}
          items={[
            { label: UI.odAllCommittees[locale], href: localePath(locale, `${TUSC_PATH}/committees`) },
            { label: UI.odNavPeople[locale], href: localePath(locale, `${TUSC_PATH}/people`) },
            { label: UI.odNavDecisions[locale], href: localePath(locale, `${TUSC_PATH}/decisions`) },
          ]}
        />
      </Stack>
    </TuscShell>
  );
}
