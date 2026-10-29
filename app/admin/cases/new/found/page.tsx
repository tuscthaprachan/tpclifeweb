import { notFound } from "next/navigation";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { canAccessService, CASE_INBOX_ROLES } from "@/lib/cases/access";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { categoryOptions, placeOptions } from "../../lost-found/data";
import { DescribeForm } from "../../lost-found/Forms";
import { TaskList } from "../../lost-found/TaskList";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("lfcFoundTitle");
}

/**
 * Found item intake, start. The first task describes the item and creates the
 * case with a draft listing; the other tasks wait (shown, not links) until it
 * exists, then the task list at /admin/cases/new/found/<id> takes over.
 */
export default async function NewFoundItemPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(CASE_INBOX_ROLES);
  if (!canAccessService(staff.roles, "lost_found")) notFound();
  const { as } = await searchParams;
  const actor = await staffActorFor(staff, "lost_found", Number(as) || null);
  const places = await placeOptions(getDb(), locale);

  return (
    <ConsolePage width="content">
      <PageHeader icon="lostFound" title={a("lfcFoundTitle", locale)} description={a("lfcFoundIntro", locale)} actions={<Button href="/admin/cases" variant="secondary" icon={<ConsoleIcon name="back" />}>{a("caseBack", locale)}</Button>} />
      <Card title={a("ckIntakeSteps", locale)} icon="check">
      <TaskList
        locale={locale}
        items={[
          { id: "describe", title: a("lfcTaskDescribe", locale), href: "#task-describe", state: "not_started" },
          { id: "photos", title: a("lfcTaskPhotos", locale), href: null, state: "cannot_start" },
          { id: "storage", title: a("lfcTaskStorage", locale), href: null, state: "cannot_start" },
          { id: "verification", title: a("lfcTaskVerification", locale), href: null, state: "cannot_start" },
          { id: "finder", title: a("lfcTaskFinder", locale), href: null, state: "cannot_start" },
          { id: "publish", title: a("lfcTaskPublish", locale), href: null, state: "cannot_start" },
        ]}
      />
      </Card>
      <div id="task-describe" tabIndex={-1}>
      <Card title={a("lfcTaskDescribe", locale)} icon="edit">
        <DescribeForm locale={locale} mode="start" orgId={actor.organisationId} defaults={{}} categories={categoryOptions(locale)} places={places} />
      </Card>
      </div>
    </ConsolePage>
  );
}
