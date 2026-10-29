"use client";

import { usePathname } from "next/navigation";
import { findActive } from "@/lib/admin/nav-match";
import { useOptionalConsoleNav } from "@/components/admin/shell/ShellContext";
import { ConsoleIcon } from "@/components/admin/icons";

export interface Crumb {
  label: string;
  /** Leave out for the current page or a heading that is not a page. */
  href?: string;
}

/** A breadcrumb trail. The last crumb without a link is the current page. */
export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className="console-crumbs">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-1 p-0">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}-${crumb.label}`} className="flex items-center gap-x-1">
              {crumb.href && !last ? (
                <a href={crumb.href} className="text-ink-600 hover:text-ink-900">
                  {crumb.label}
                </a>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-ink-900" : "text-ink-600"}>
                  {crumb.label}
                </span>
              )}
              {last ? null : <ConsoleIcon name="chevronRight" size={14} className="text-ink-500" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Breadcrumbs built from the console navigation and the current path: the
 * group, the nav item (a link once you are deeper than it), then the page
 * title when it is plain text. Renders nothing on the dashboard or a path the
 * nav does not list.
 */
export function AutoBreadcrumbs({ title }: { title?: string }) {
  const pathname = usePathname();
  const ctx = useOptionalConsoleNav();
  if (!ctx) return null;
  const active = findActive(ctx.nav.groups, pathname);
  if (!active || active.item.id === "dashboard") return null;

  const deeper = pathname.replace(/\/$/, "") !== active.item.href;
  const items: Crumb[] = [];
  if (active.group.id !== "work") items.push({ label: active.group.label });
  items.push({ label: active.item.label, href: deeper ? active.item.href : undefined });
  if (deeper && title) items.push({ label: title });
  return <Breadcrumbs items={items} label={ctx.labels.breadcrumbs} />;
}
