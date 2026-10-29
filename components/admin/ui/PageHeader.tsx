import type { ReactNode } from "react";
import { ConsoleIcon, type ConsoleIconName } from "@/components/admin/icons";
import { Heading } from "@/components/ui";
import { AutoBreadcrumbs, Breadcrumbs, type Crumb } from "./Breadcrumbs";

export interface PageHeaderProps {
  /** The page's h1. Plain text also becomes the last breadcrumb on a nested page. */
  title: ReactNode;
  description?: ReactNode;
  icon?: ConsoleIconName;
  /**
   * Omit for crumbs built from the nav and current path. Pass your own list
   * (with the label for the trail's `aria-label` in `breadcrumbsLabel`), or
   * `false` for none.
   */
  breadcrumbs?: Crumb[] | false;
  breadcrumbsLabel?: string;
  /** Tags next to the title: status, counts. */
  status?: ReactNode;
  /** Buttons on the right, wrapping under the title on a narrow screen. */
  actions?: ReactNode;
  /** A sub-navigation or tab strip under the header. */
  tabs?: ReactNode;
  className?: string;
}

/** The top of a console page: trail, icon and h1, status tags, description, actions and tabs. */
export function PageHeader({ title, description, icon, breadcrumbs, breadcrumbsLabel, status, actions, tabs, className = "" }: PageHeaderProps) {
  return (
    <header className={`console-page-header ${className}`}>
      {breadcrumbs === false ? null : breadcrumbs ? (
        <Breadcrumbs items={breadcrumbs} label={breadcrumbsLabel ?? ""} />
      ) : (
        <AutoBreadcrumbs title={typeof title === "string" ? title : undefined} />
      )}
      <div className="console-page-header-row">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
            {icon ? <ConsoleIcon name={icon} size={24} className="text-ink-600" /> : null}
            <Heading level={1} className="m-0">
              {title}
            </Heading>
            {status ? <div className="flex flex-wrap items-center gap-[var(--space-2)]">{status}</div> : null}
          </div>
          {description ? <div className="mt-[var(--space-1)] max-w-[var(--width-reading)] text-ink-600">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-[var(--space-2)]">{actions}</div> : null}
      </div>
      {tabs ? <div className="console-page-tabs">{tabs}</div> : null}
    </header>
  );
}
