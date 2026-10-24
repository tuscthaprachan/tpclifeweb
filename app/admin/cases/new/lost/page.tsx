import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { canAccessService, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { a } from "@/lib/i18n/admin";
import { NotificationBanner } from "@/components/ui";
import { categoryOptions, placeOptions } from "../../lost-found/data";
import { WalkInLostForm } from "../../lost-found/Forms";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("lfcLostTitle");
}

/** A lost report taken at the desk (walk-in or phone) on behalf of someone, in the same case system as the online ones. */
export default async function NewLostReportPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(CASE_INBOX_ROLES);
  if (!canAccessService(staff.roles, "lost_found")) notFound();
  const { as } = await searchParams;
  const actor = await staffActorFor(staff, "lost_found", Number(as) || null);
  const places = await placeOptions(getDb(), locale);

  return (
    <AdminPage width="content">
      <div>
        <a href="/admin/cases">{a("caseBack", locale)}</a>
        <Heading level={1} className="mt-[var(--space-2)]">
          {a("lfcLostTitle", locale)}
        </Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("lfcLostIntro", locale)}</p>
      </div>
      {isPiiAvailable() ? (
        <WalkInLostForm locale={locale} orgId={actor.organisationId} categories={categoryOptions(locale)} places={places} />
      ) : (
        <NotificationBanner variant="warning" title={a("errCaseUnavailable", locale)}>
          {a("lfcPiiUnavailable", locale)}
        </NotificationBanner>
      )}
    </AdminPage>
  );
}
