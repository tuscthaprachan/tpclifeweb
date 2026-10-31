import Link from "next/link";
import { StatusTag } from "@/components/ui/StatusTag";
import { localePath, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { fillText } from "../fill";
import { UI } from "@/lib/i18n/strings";
import type { BodyRow, DocumentSummary, MembershipRow } from "@/lib/open-data/read";
import { TUSC_PATH, documentPath } from "../sections";
import { documentDate, documentTitle } from "../documents";
import { bodyName, type Labelled } from "./labels";
import { isMarkerText, printedOrNull, sourceNumbers } from "./model";

export function TextOf({ label }: { label: Labelled }) {
  return label.thai && label.text ? <span lang="th">{label.text}</span> : <>{label.text}</>;
}

/** A name as printed, marked as Thai. */
export function ThaiName({ name }: { name: string }) {
  return <span lang="th">{name}</span>;
}

export function NotStated({ locale }: { locale: Locale }) {
  return <>{UI.odNotStated[locale]}</>;
}

export function DateOrNotStated({ iso, locale }: { iso: string | null; locale: Locale }) {
  return iso ? <>{formatDate(iso, locale)}</> : <NotStated locale={locale} />;
}

export function bodyPath(slug: string): string {
  return `${TUSC_PATH}/committees/${slug}`;
}

export function BodyLink({ body, locale }: { body: Pick<BodyRow, "slug" | "nameTh" | "nameEn">; locale: Locale }) {
  return (
    <Link href={localePath(locale, bodyPath(body.slug))} className="text-action underline hover:text-action-hover">
      <TextOf label={bodyName(body, locale)} />
    </Link>
  );
}

export function BodyStatus({ activity, locale }: { activity: string | null; locale: Locale }) {
  if (activity === "active") return <StatusTag tone="success" label={UI.odStatusActive[locale]} />;
  if (isMarkerText(activity)) return <NotStated locale={locale} />;
  return <>{activity}</>;
}

/** Links to the documents a row cites, then the place in them as printed. */
export function SourceLinks({
  row,
  documents,
  locale,
}: {
  row: Pick<MembershipRow, "sourceDocuments" | "sourceDocumentSlug" | "sourceAnchor">;
  documents: ReadonlyMap<string, DocumentSummary>;
  locale: Locale;
}) {
  const docs = sourceNumbers(row.sourceDocuments)
    .map((number) => documents.get(number))
    .filter((doc): doc is DocumentSummary => doc !== undefined);
  const anchor = printedOrNull(row.sourceAnchor);
  if (docs.length === 0) return <NotStated locale={locale} />;
  return (
    <>
      {docs.map((doc, index) => (
        <span key={doc.id}>
          {index > 0 ? "; " : ""}
          <Link href={localePath(locale, documentPath(doc.slug))} className="text-action underline hover:text-action-hover">
            {documentTitle(doc, locale)}
          </Link>
          <> ({documentDate(doc, locale)})</>
        </span>
      ))}
      {anchor ? (
        <>
          , <span lang="th">{anchor}</span>
        </>
      ) : null}
    </>
  );
}

/** "from 26 May 2025 to 8 January 2026", or the part of it the data holds; empty when it holds neither date. */
export function periodText(from: string | null, to: string | null, locale: Locale): string {
  if (from && to) return fillText(UI.odRoleFromTo[locale], { from: formatDate(from, locale), to: formatDate(to, locale) });
  if (from) return fillText(UI.odRoleFrom[locale], { from: formatDate(from, locale) });
  if (to) return fillText(UI.odRoleTo[locale], { to: formatDate(to, locale) });
  return "";
}
