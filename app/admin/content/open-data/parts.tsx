import type { ReactNode } from "react";
import { FilterChips, PageHeader, type Crumb, type FilterChip } from "@/components/admin/ui";
import { contentPlacement, contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { queryString } from "@/app/admin/content/_list/parts";
import { OPEN_DATA_PATHS } from "@/lib/admin/open-data/paths";
import type { OpenDataOwner } from "@/lib/db/schema/content/open-data";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export type OpenDataSection = "documents" | "meetings" | "budget" | "funds" | "import";

export const ownerLabel = (owner: string, locale: Locale): string => (owner === "tusu" ? UI.ownerTusu[locale] : owner === "tusc" ? UI.ownerTusc[locale] : owner);

/** The sections of the open data editor, as links that work without JavaScript. */
export function OpenDataTabs({ locale, current }: { locale: Locale; current: OpenDataSection }) {
  const options: FilterChip[] = [
    { id: "documents", label: a("odmTabDocuments", locale), href: OPEN_DATA_PATHS.documents },
    { id: "meetings", label: a("odmTabMeetings", locale), href: OPEN_DATA_PATHS.meetings },
    { id: "budget", label: a("odmTabBudget", locale), href: OPEN_DATA_PATHS.budget },
    { id: "funds", label: a("odmTabFunds", locale), href: OPEN_DATA_PATHS.funds },
    { id: "import", label: a("odmTabImport", locale), href: OPEN_DATA_PATHS.import },
  ];
  return <FilterChips label={a("odmTabsLabel", locale)} options={options} current={current} />;
}

/** All / TUSC / TUSU, for staff who may edit more than one body. Nothing for a single body. */
export function OwnerChips({ locale, owners, current, base, params }: { locale: Locale; owners: readonly OpenDataOwner[]; current?: OpenDataOwner; base: string; params: Record<string, string | undefined> }) {
  if (owners.length < 2) return null;
  const href = (owner?: string) => `${base}${queryString({ ...params, owner, page: undefined })}`;
  return (
    <FilterChips
      label={a("odmFilterOwner", locale)}
      current={current ?? "all"}
      options={[{ id: "all", label: a("ccFilterAll", locale), href: href() }, ...owners.map((o) => ({ id: o, label: ownerLabel(o, locale), href: href(o) }))]}
    />
  );
}

/** Reads `?owner=` as one of the owners this person may see, else undefined for all of them. */
export function parseOwner(value: string | undefined, owners: readonly OpenDataOwner[]): OpenDataOwner | undefined {
  return owners.find((o) => o === value);
}

/** The header of every open data page below the documents list: trail, title and the section tabs. */
export function OpenDataHeader({
  locale,
  section,
  title,
  description,
  trail = [],
  actions,
}: {
  locale: Locale;
  section: OpenDataSection;
  title: string;
  description?: ReactNode;
  trail?: Crumb[];
  actions?: ReactNode;
}) {
  const def = contentTypeBySegment("open-data");
  const place = contentPlacement(def);
  return (
    <PageHeader
      title={title}
      icon={place.icon}
      description={description}
      breadcrumbs={[{ label: a(place.groupLabelKey, locale) }, { label: a("typeOpenData", locale), href: OPEN_DATA_PATHS.documents }, ...trail, { label: title }]}
      breadcrumbsLabel={a("csBreadcrumbs", locale)}
      actions={actions}
      tabs={<OpenDataTabs locale={locale} current={section} />}
    />
  );
}
