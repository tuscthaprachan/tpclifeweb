import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { documentTitle } from "./documents";
import { documentPath, TUSC_PATH } from "./sections";

interface SourceDocumentLinkProps {
  locale: Locale;
  /** The open data document to cite, or the fund regulations when `funds` is set. */
  document?: { slug: string; titleTh: string; titleEn: string };
  funds?: boolean;
}

/** A short "Source document" line linking to the open data page a service page draws on. */
export function SourceDocumentLink({ locale, document, funds }: SourceDocumentLinkProps) {
  if (!document && !funds) return null;
  const href = document ? documentPath(document.slug) : `${TUSC_PATH}/funds`;
  const label = document ? documentTitle(document, locale) : UI.odWelfareFundsLink[locale];
  return (
    <p className="m-0">
      {UI.odSourceDocument[locale]}:{" "}
      <Link href={localePath(locale, href)} className="font-medium text-action underline hover:text-action-hover">
        {label}
      </Link>
    </p>
  );
}
