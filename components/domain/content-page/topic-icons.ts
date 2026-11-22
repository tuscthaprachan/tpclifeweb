import {
  BadgePercent,
  Brain,
  Building2,
  Bus,
  Globe,
  HandCoins,
  HeartHandshake,
  Landmark,
  Languages,
  Library,
  MapPin,
  Printer,
  Scale,
  ScrollText,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  TrainFront,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { ContentPage } from "@/lib/content/types";

const BY_SLUG: Record<string, LucideIcon> = {
  "student-facilities": Building2,
  "library-welfare": Library,
  "discounts-and-exam-fees": BadgePercent,
  "shuttle-buses-and-travel": Bus,
  "sanitary-products-and-facilities": Printer,
  "scholarships-and-disability-support": HandCoins,
  "healthcare-rights": Stethoscope,
  "accident-insurance": ShieldPlus,
  "mental-health-services": Brain,
  "student-rights-elections-dress-and-titles": Vote,
  "our-tpc": Landmark,
  "getting-to-tha-prachan": MapPin,
  "tha-prachan-to-rangsit": TrainFront,
  "tu-get": Languages,
  "tu-library": Library,
  "student-discounts": BadgePercent,
  "about-tusc": Scale,
  "about-tusu": Users,
  "useful-online-services": Globe,
  "rules-and-documents": ScrollText,
};

const BY_CATEGORY: Record<ContentPage["category"], LucideIcon> = {
  transport: Bus,
  welfare: HeartHandshake,
  activity: Sparkles,
  governance: Landmark,
};

export function topicIcon(page: Pick<ContentPage, "slug" | "category">): LucideIcon {
  return BY_SLUG[page.slug.current] ?? BY_CATEGORY[page.category];
}
