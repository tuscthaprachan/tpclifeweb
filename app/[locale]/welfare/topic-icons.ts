import {
  BadgePercent,
  Brain,
  Building2,
  Bus,
  HandCoins,
  HeartHandshake,
  Landmark,
  Library,
  Printer,
  ShieldPlus,
  Sparkles,
  Stethoscope,
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
};

const BY_CATEGORY: Record<ContentPage["category"], LucideIcon> = {
  transport: Bus,
  welfare: HeartHandshake,
  activity: Sparkles,
  governance: Landmark,
};

export function welfareTopicIcon(page: Pick<ContentPage, "slug" | "category">): LucideIcon {
  return BY_SLUG[page.slug.current] ?? BY_CATEGORY[page.category];
}
