import {
  Accessibility,
  BookOpen,
  BookUser,
  Bus,
  CalendarDays,
  ChartColumn,
  CircleHelp,
  ClipboardList,
  Clock,
  Cookie,
  Database,
  Info,
  Landmark,
  LayoutGrid,
  Library,
  MapPin,
  MessageSquareWarning,
  Newspaper,
  Package,
  PackageSearch,
  HeartPulse,
  Scale,
  Search,
  Star,
  Sun,
  Thermometer,
  TriangleAlert,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

const PATH_ICONS: ReadonlyArray<readonly [string, LucideIcon]> = [
  ["/about/open-data", Database],
  ["/complaints", MessageSquareWarning],
  ["/report", MessageSquareWarning],
  ["/borrow", Package],
  ["/lost-and-found", PackageSearch],
  ["/welfare", HeartPulse],
  ["/eat", UtensilsCrossed],
  ["/directory", BookUser],
  ["/forms", ClipboardList],
  ["/getting-around", Bus],
  ["/news", Newspaper],
  ["/events", CalendarDays],
  ["/policy", Scale],
  ["/guide", BookOpen],
  ["/faq", CircleHelp],
  ["/places/libraries", Library],
  ["/places", MapPin],
  ["/weather", Thermometer],
  ["/alerts", TriangleAlert],
  ["/search", Search],
  ["/performance", ChartColumn],
  ["/accessibility", Accessibility],
  ["/cookies", Cookie],
  ["/about", Info],
  ["/services", LayoutGrid],
];

export function iconForPath(path: string): LucideIcon {
  const match = PATH_ICONS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return match ? match[1] : LayoutGrid;
}

export const SECTION_ICONS = {
  today: Sun,
  popular: Star,
  whatsOn: CalendarDays,
  union: Landmark,
  events: CalendarDays,
  news: Newspaper,
} as const satisfies Record<string, LucideIcon>;

export const TODAY_ICONS = {
  shuttle: Bus,
  libraries: Library,
  places: Clock,
  weather: Thermometer,
  alert: TriangleAlert,
} as const satisfies Record<string, LucideIcon>;
