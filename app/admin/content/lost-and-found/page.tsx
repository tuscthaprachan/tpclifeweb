import { NotConfigured } from "@/components/admin/NotConfigured";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { a } from "@/lib/i18n/admin";
import { canWorkLostFoundCases, redirectToCases, requireLostFoundRouteAccess } from "./access";
import { LostFoundNoAccess } from "./NoAccess";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("lfrNoAccessTitle", locale) };
}

export default async function LostFoundListPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireLostFoundRouteAccess();
  if (await canWorkLostFoundCases(staff)) redirectToCases();
  return <LostFoundNoAccess locale={locale} />;
}
