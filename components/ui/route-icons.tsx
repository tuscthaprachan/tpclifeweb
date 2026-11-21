/**
 * One icon per section of the public site, keyed by path, so the same place
 * shows the same icon everywhere: the Popular tiles, the services list, the
 * menu, the footer and the Today rows.
 *
 * Icons only ever sit beside a visible label and are `aria-hidden`: the word
 * carries the meaning, the icon helps people scan.
 */

import {
  Accessibility,
  BellRing,
  BookOpen,
  Bus,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  CloudSun,
  Contact,
  Cookie,
  Database,
  FileText,
  Flag,
  Gauge,
  HeartHandshake,
  Info,
  Landmark,
  LayoutGrid,
  Library,
  MapPin,
  MessageSquareWarning,
  Newspaper,
  Package,
  PackageSearch,
  Palette,
  Search,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { cx } from "./cx";

/** Longest matching prefix wins, so `/places/libraries` beats `/places`. */
const ROUTE_ICONS: Record<string, LucideIcon> = {
  "/about": Info,
  "/accessibility": Accessibility,
  "/alerts": BellRing,
  "/borrow": Package,
  "/complaints": MessageSquareWarning,
  "/cookies": Cookie,
  "/design": Palette,
  "/directory": Contact,
  "/eat": Utensils,
  "/events": CalendarDays,
  "/faq": CircleHelp,
  "/forms": FileText,
  "/getting-around": Bus,
  "/guide": BookOpen,
  "/lost-and-found": PackageSearch,
  "/news": Newspaper,
  "/about/open-data": Database,
  "/performance": Gauge,
  "/places": MapPin,
  "/places/libraries": Library,
  "/policy": Landmark,
  "/report": Flag,
  "/search": Search,
  "/services": LayoutGrid,
  "/weather": CloudSun,
  "/welfare": HeartHandshake,
};

const LOCALE_PREFIX = /^\/(th|en)(?=\/|$)/;

/** The icon for a site path, with or without its `/th` or `/en` prefix. Undefined when no section matches. */
export function iconForPath(path: string): LucideIcon | undefined {
  const clean = (path.split(/[?#]/)[0] ?? "").replace(LOCALE_PREFIX, "") || "/";
  let best: string | undefined;
  for (const prefix of Object.keys(ROUTE_ICONS)) {
    if ((clean === prefix || clean.startsWith(`${prefix}/`)) && (!best || prefix.length > best.length)) best = prefix;
  }
  return best ? ROUTE_ICONS[best] : undefined;
}

/** Same as {@link iconForPath}, falling back to a neutral icon so a list of tiles stays even. */
export function iconForPathOrDefault(path: string): LucideIcon {
  return iconForPath(path) ?? ClipboardList;
}

interface RouteIconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

/** A decorative icon: always `aria-hidden`, never focusable, sized to sit beside text. */
export function DecorativeIcon({ icon: Icon, className, size = 18 }: RouteIconProps) {
  return <Icon aria-hidden="true" focusable="false" size={size} strokeWidth={2} className={cx("shrink-0", className)} />;
}

interface IconTileProps {
  icon: LucideIcon;
  /** `solid` for a tile on a plain surface, `inverse` for one on a filled (action) background. */
  tone?: "solid" | "inverse" | "soft";
  className?: string;
}

const TILE_TONE: Record<NonNullable<IconTileProps["tone"]>, string> = {
  solid: "bg-action text-action-ink",
  inverse: "bg-action-ink text-action",
  soft: "bg-surface text-action",
};

/** A rounded square holding an icon, for the start of a list tile. */
export function IconTile({ icon, tone = "soft", className }: IconTileProps) {
  return (
    <span aria-hidden="true" className={cx("grid size-10 shrink-0 place-items-center rounded-[var(--radius-panel)]", TILE_TONE[tone], className)}>
      <DecorativeIcon icon={icon} size={20} />
    </span>
  );
}
