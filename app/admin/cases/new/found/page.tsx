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
    <AdminPage width="content">
      <div>
        <a href="/admin/cases">{a("caseBack", locale)}</a>
        <Heading level={1} className="mt-[var(--space-2)]">
          {a("lfcFoundTitle", locale)}
        </Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("lfcFoundIntro", locale)}</p>
      </div>
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
      <section aria-labelledby="task-describe" className="flex flex-col gap-[var(--space-4)]">
        <Heading level={2} id="task-describe">
          {a("lfcTaskDescribe", locale)}
        </Heading>
        <DescribeForm locale={locale} mode="start" orgId={actor.organisationId} defaults={{}} categories={categoryOptions(locale)} places={places} />
      </section>
    </AdminPage>
  );
}
