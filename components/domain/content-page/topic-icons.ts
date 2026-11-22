import {
  Accessibility,
  BadgePercent,
  BookMarked,
  BookOpenCheck,
  Brain,
  Bus,
  CalendarCheck,
  Coffee,
  Dumbbell,
  HandCoins,
  HeartHandshake,
  Landmark,
  Languages,
  Library,
  MapPin,
  Pill,
  Printer,
  ReceiptText,
  Scale,
  ShieldPlus,
  Shirt,
  Sparkles,
  Stethoscope,
  TrainFront,
  Vote,
  Wifi,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ContentPage } from "@/lib/content/types";

const BY_SLUG: Record<string, LucideIcon> = {
  "getting-to-campus": MapPin,
  "get-online": Wifi,
  "what-your-student-card-gets-you": BadgePercent,
  "dress-and-titles": Shirt,
  "book-a-space": CalendarCheck,
  "fitness-and-sport": Dumbbell,
  "cafes-and-shops": Coffee,
  discounts: ReceiptText,
  "book-a-study-room": BookMarked,
  libraries: Library,
  "tu-get": Languages,
  "printing-and-checking-your-work": Printer,
  "borrow-from-the-library": BookOpenCheck,
  "getting-to-rangsit": TrainFront,
  "after-an-accident": ShieldPlus,
  "talk-to-someone": Brain,
  "see-a-doctor": Stethoscope,
  "medical-and-dental-costs": HandCoins,
  "claim-accident-insurance": ShieldPlus,
  "sanitary-products-and-condoms": Pill,
  "disability-support": Accessibility,
  "hardship-grants": Wallet,
  "who-represents-you": Vote,
  "rules-and-your-rights": Scale,
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
