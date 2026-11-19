import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ConsolePage } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { contentTypeBySegment } from "@/app/admin/content/_list/placement";
import { canEditContent } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { hasRole } from "@/lib/auth/roles";
import { getDb } from "@/lib/db";
import { lostFoundItems } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { canWorkLostFoundCases, redirectToCases, requireLostFoundRouteAccess } from "../access";
import { LostFoundForm } from "../LostFoundForm";
import { LostFoundNoAccess } from "../NoAccess";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("typeLostFoundOne", locale) };
}

export default async function EditLostFoundPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireLostFoundRouteAccess();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved } = await searchParams;

  const [item] = await getDb().select({ caseId: lostFoundItems.caseId }).from(lostFoundItems).where(eq(lostFoundItems.id, id));
  if (!item) notFound();
  if (item.caseId && (await canWorkLostFoundCases(staff))) redirectToCases(`/admin/cases/${item.caseId}#listing`);
  if (!canEditContent(staff.roles) || (item.caseId && !hasRole(staff.roles, "admin"))) return <LostFoundNoAccess locale={locale} />;

  return (
    <ConsolePage width="wide">
      <FormPageHeader def={contentTypeBySegment("lost-and-found")} locale={locale} mode="edit" />
      <LostFoundForm locale={locale} id={id} saved={saved} />
    </ConsolePage>
  );
}
