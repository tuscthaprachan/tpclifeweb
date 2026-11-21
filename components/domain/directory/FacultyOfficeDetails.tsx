import { SummaryList, type SummaryListRow } from "@/components/ui";
import type { FacultyOffice } from "@/lib/content/faculties";
import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

const websiteHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

export function facultyOfficeRows(office: FacultyOffice, locale: Locale): SummaryListRow[] {
  const link = "text-action underline";
  return ([
    office.location ? { key: UI.cpRedirectOfficeLocation[locale], value: pick(office.location, locale) } : null,
    office.phone ? { key: UI.cpRedirectOfficePhone[locale], value: <a href={`tel:${office.phone.replace(/[\s-]/g, "")}`} className={link}>{office.phone}</a> } : null,
    office.email ? { key: UI.cpRedirectOfficeEmail[locale], value: <a href={`mailto:${office.email}`} className={link}>{office.email}</a> } : null,
    office.website
      ? {
          key: UI.cpRedirectOfficeWebsite[locale],
          value: (
            <a href={websiteHref(office.website)} target="_blank" rel="noreferrer" className={link}>
              {office.website}
              <span className="visually-hidden"> {UI.cpRedirectOpensNewTab[locale]}</span>
            </a>
          ),
        }
      : null,
    office.note ? { key: UI.cpRedirectOfficeNote[locale], value: <span className="whitespace-pre-line">{pick(office.note, locale)}</span> } : null,
  ] as Array<SummaryListRow | null>).filter((row): row is SummaryListRow => row !== null);
}

export function FacultyOfficeDetails({ office, locale, empty }: { office: FacultyOffice | undefined; locale: Locale; empty: string }) {
  const rows = office ? facultyOfficeRows(office, locale) : [];
  return rows.length > 0 ? <SummaryList rows={rows} /> : <p className="m-0 text-ink-900">{empty}</p>;
}
