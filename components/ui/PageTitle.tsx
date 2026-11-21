import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Heading } from "./Heading";
import { cx } from "./cx";
import { IconTile, iconForPath } from "./route-icons";

interface PageTitleProps {
  /** The section's path, such as "/eat". Picks the same icon the menu and the services list use. */
  path: string;
  /** Overrides the icon looked up from `path`. */
  icon?: LucideIcon;
  children: ReactNode;
  /** Classes for the heading itself. */
  className?: string;
  id?: string;
}

/**
 * The h1 of a section's landing page with its icon beside it. The icon is
 * decorative (`aria-hidden`) and the heading text carries the meaning. With
 * no icon for the path it renders the plain heading.
 */
export function PageTitle({ path, icon, children, className, id }: PageTitleProps) {
  const Icon = icon ?? iconForPath(path);
  if (!Icon) {
    return (
      <Heading level={1} id={id} className={className}>
        {children}
      </Heading>
    );
  }
  return (
    <div className="flex items-center gap-[var(--space-3)]">
      <IconTile icon={Icon} tone="solid" className="size-12" />
      <Heading level={1} id={id} className={cx("m-0 min-w-0", className)}>
        {children}
      </Heading>
    </div>
  );
}
