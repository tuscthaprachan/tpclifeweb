import type { ReactNode } from "react";
import type { Crumb } from "@/components/admin/ui";
import { PageHeader } from "@/components/admin/ui";
import { contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { contentPlacement } from "./placement";

interface FormPageHeaderProps {
  def: ContentTypeDef;
  locale: Locale;
  /** "new" and "edit" are collection pages; "page" is a singleton's own page. */
  mode: "new" | "edit" | "page";
  /** Replaces the default title (for the images upload page and the prices page). */
  title?: string;
  /** Crumbs between the type's list and the current page. */
  trail?: Crumb[];
  description?: ReactNode;
  actions?: ReactNode;
}

/** The header of a content add, edit or singleton page: the type's icon, a title and a trail of group, list, then this page. */
export function FormPageHeader({ def, locale, mode, title, trail = [], description, actions }: FormPageHeaderProps) {
  const place = contentPlacement(def);
  const label = a(def.labelKey, locale);
  const item = a(def.oneKey, locale);
  const heading = title ?? (mode === "new" ? a("listAdd", locale, { item }) : mode === "edit" ? a("editItem", locale, { item }) : label);
  const crumbs: Crumb[] = [{ label: a(place.groupLabelKey, locale) }];
  if (mode === "page") {
    crumbs.push({ label });
  } else {
    crumbs.push({ label, href: contentPath(def) }, ...trail, { label: heading });
  }
  return (
    <PageHeader
      title={heading}
      icon={place.icon}
      description={description ?? (mode === "page" ? a(def.descriptionKey, locale) : undefined)}
      breadcrumbs={crumbs}
      breadcrumbsLabel={a("csBreadcrumbs", locale)}
      actions={actions}
    />
  );
}
