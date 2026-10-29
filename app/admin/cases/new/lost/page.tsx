import { notFound } from "next/navigation";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { canAccessService, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { isPiiAvailable } from "@/lib/crypto/pii";
import { a } from "@/lib/i18n/admin";
import { Button, NotificationBanner } from "@/components/ui";
import { ConsoleIcon } from "@/components/admin/icons";
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
    <ConsolePage width="content">
      <PageHeader icon="lostFound" title={a("lfcLostTitle", locale)} description={a("lfcLostIntro", locale)} actions={<Button href="/admin/cases" variant="secondary" icon={<ConsoleIcon name="back" />}>{a("caseBack", locale)}</Button>} />
      {isPiiAvailable() ? (
        <Card title={a("ckFormDetails", locale)} icon="lostFound" description={a("ckLostFormHint", locale)}>
          <WalkInLostForm locale={locale} orgId={actor.organisationId} categories={categoryOptions(locale)} places={places} />
        </Card>
      ) : (
        <NotificationBanner variant="warning" title={a("errCaseUnavailable", locale)}>
          {a("lfcPiiUnavailable", locale)}
        </NotificationBanner>
      )}
    </ConsolePage>
  );
}
