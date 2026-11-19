import Link from "next/link";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage, EmptyPanel, PageHeader } from "@/components/admin/ui";
import { Button, Timestamp } from "@/components/ui";
import { canEditContent } from "@/lib/admin/content/access";
import { CONTENT_TYPES, contentPath } from "@/lib/admin/content/types";
import { describeAction, entityHref } from "@/lib/admin/audit/describe";
import { loadRecentActivity, type ActivityItem } from "@/lib/admin/dashboard/activity";
import { loadBorrowingCounts, loadCaseCounts, loadEditorCounts, loadMyCases, loadMyDrafts, type MyCases, type MyDraft } from "@/lib/admin/dashboard/summary";
import { buildTodo, todoCount, type TodoItem } from "@/lib/admin/dashboard/todo";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { buildConsoleNav, resolveNav } from "@/lib/admin/nav";
import { isAuthConfigured } from "@/lib/auth";
import { hasRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { accessibleServices, canAccessService, canUseCaseInbox } from "@/lib/cases/access";
import { getServiceDef } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("dashTitle");
}

const ROW = "flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-t border-line px-[var(--space-4)] py-[var(--space-2)] first:border-t-0";
const LINK = "inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]";

export default async function AdminDashboardPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff();
  const db = getDb();

  const editor = canEditContent(staff.roles);
  const cases = canUseCaseInbox(staff.roles);
  const services = accessibleServices(staff.roles);
  const borrowing = canAccessService(staff.roles, "borrowing");
  const [caseCounts, editorCounts, borrowingCounts, activity, myCases, myDrafts] = await Promise.all([
    cases && services[0] ? staffActorFor(staff, services[0]).then((actor) => loadCaseCounts(db, actor)) : null,
    editor ? loadEditorCounts(db) : null,
    borrowing ? loadBorrowingCounts(db) : null,
    loadRecentActivity(db, { userId: staff.user.id, roles: staff.roles }),
    cases ? loadMyCases(db, staff.user.id, staff.roles) : [],
    editor ? loadMyDrafts(db, staff.user.id) : [],
  ]);

  const todo = buildTodo({ cases: caseCounts, borrowing: borrowingCounts, editor: editorCounts });
  const actions = todo.filter((t) => t.kind === "action");
  const info = todo.filter((t) => t.kind === "info");
  const attention = todoCount(todo);
  const name = staff.user.name || staff.user.email;
  const summary =
    !caseCounts && !editorCounts && !borrowingCounts
      ? a("chSummaryPlain", locale)
      : attention === 0
        ? a("chSummaryNone", locale)
        : attention === 1
          ? a("chSummaryOne", locale)
          : a("chSummaryMany", locale, { count: formatNumber(attention, locale) });

  const quickCreate = resolveNav(buildConsoleNav(staff.roles), locale).quickCreate;
  const lostFound = services.includes("lost_found");
  const admin = hasRole(staff.roles, "admin");
  const openCases = myCases.filter((c) => c.open > 0);

  return (
    <ConsolePage width="wide">
      <PageHeader title={a("chGreeting", locale, { name })} description={summary} icon="dashboard" breadcrumbs={false} />

      <div className="grid gap-[var(--space-4)] lg:grid-cols-3">
        <Card title={a("shHomeTodo", locale)} icon="check" padded={false} className="lg:col-span-2 lg:col-start-1">
          {actions.length === 0 ? (
            <div className="p-[var(--space-4)]">
              <EmptyPanel icon="check" title={a("chSummaryNone", locale)} level={3} />
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {actions.map((item) => (
                <TodoRow key={item.id} item={item} locale={locale} />
              ))}
            </ul>
          )}
          {info.length > 0 ? (
            <ul className="m-0 list-none border-t border-line p-0">
              {info.map((item) => (
                <TodoRow key={item.id} item={item} locale={locale} />
              ))}
            </ul>
          ) : null}
        </Card>

        <div className="flex flex-col gap-[var(--space-4)] lg:col-start-3 lg:row-span-2 lg:row-start-1">
          {lostFound || quickCreate.length > 0 ? (
            <section aria-label={a("shCreateTitle", locale)} className="flex flex-col gap-[var(--space-2)]">
              {lostFound ? (
                <div className="flex flex-wrap gap-[var(--space-2)]">
                  <Button href="/admin/cases/new/found" icon={<ConsoleIcon name="lostFound" />}>
                    {a("lfcInboxLogFound", locale)}
                  </Button>
                  <Button href="/admin/cases/new/lost" icon={<ConsoleIcon name="lostFound" />}>
                    {a("lfcInboxLogLost", locale)}
                  </Button>
                </div>
              ) : null}
              {quickCreate.length > 0 ? (
                <details className="console-card">
                  <summary className="inline-flex min-h-[var(--target-min)] w-full cursor-pointer list-none items-center gap-[var(--space-2)] rounded-control bg-action px-[var(--space-4)] py-[var(--space-2)] font-medium text-action-ink hover:bg-action-hover [&::-webkit-details-marker]:hidden">
                    <ConsoleIcon name="add" />
                    {lostFound ? a("shCreateMore", locale) : a("shCreateTitle", locale)}
                  </summary>
                  <ul className="m-0 grid list-none gap-[var(--space-1)] p-[var(--space-2)]">
                    {quickCreate.map((q) => (
                      <li key={q.id}>
                        <Link href={q.href} className={LINK}>
                          <ConsoleIcon name="add" />
                          {q.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          ) : null}

          {cases || editor ? (
            <Card title={a("shWorkTitle", locale)} icon="account">
              <MyWork cases={openCases} drafts={myDrafts} locale={locale} showDrafts={editor} showCases={cases} />
            </Card>
          ) : null}
        </div>

        <Card title={a("opActivityTitle", locale)} icon="audit" padded={false} className="lg:col-span-2 lg:col-start-1">
          {activity.length === 0 ? (
            <div className="p-[var(--space-4)]">
              <EmptyPanel icon="info" title={a("opActivityEmpty", locale)} level={3} />
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {activity.map((item) => (
                <ActivityRow key={item.id} item={item} locale={locale} />
              ))}
            </ul>
          )}
          {admin ? (
            <p className="m-0 border-t border-line px-[var(--space-4)] py-[var(--space-2)]">
              <Link href="/admin/audit" className={LINK}>
                <ConsoleIcon name="audit" />
                {a("opActivityAll", locale)}
              </Link>
            </p>
          ) : null}
        </Card>
      </div>
    </ConsolePage>
  );
}

function TodoRow({ item, locale }: { item: TodoItem; locale: Locale }) {
  const text = a(item.labelKey, locale, { count: formatNumber(item.count, locale) });
  return (
    <li className={ROW}>
      <ConsoleIcon name={item.icon} className="text-ink-600" />
      <div className="min-w-0 flex-[1_1_12rem]">
        <Link href={item.href} className={`${LINK} font-medium`}>
          {text}
        </Link>
        {item.kind === "info" ? <span className="ms-[var(--space-2)] text-sm text-ink-600">{a("shTodoInfoTag", locale)}</span> : null}
      </div>
      <ConsoleIcon name="chevronRight" size={16} className="text-ink-600" />
    </li>
  );
}

function MyWork({ cases, drafts, locale, showCases, showDrafts }: { cases: MyCases[]; drafts: MyDraft[]; locale: Locale; showCases: boolean; showDrafts: boolean }) {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {showCases ? (
        <div>
          <h3 className="m-0 mb-[var(--space-2)] text-base font-semibold">{a("shWorkCases", locale)}</h3>
          {cases.length === 0 ? (
            <p className="m-0 text-sm text-ink-600">{a("shWorkNoCases", locale)}</p>
          ) : (
            <ul className="m-0 grid list-none gap-[var(--space-1)] p-0">
              {cases.map((c) => (
                <li key={c.service}>
                  <Link href={`/admin/cases?assignee=me&open=1&service=${c.service}`} className={LINK}>
                    <ConsoleIcon name="cases" />
                    <span>{a("opMyCasesRow", locale, { service: pick(getServiceDef(c.service).label, locale), count: formatNumber(c.open, locale) })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {showDrafts ? (
        <div>
          <h3 className="m-0 mb-[var(--space-2)] text-base font-semibold">{a("shWorkDrafts", locale)}</h3>
          {drafts.length === 0 ? (
            <p className="m-0 text-sm text-ink-600">{a("opMyDraftsEmpty", locale)}</p>
          ) : (
            <ul className="m-0 grid list-none gap-[var(--space-1)] p-0">
              {drafts.map((d) => {
                const def = CONTENT_TYPES.find((t) => t.key === d.typeKey)!;
                const title = pick(d.title, locale) || pick({ th: d.title.en, en: d.title.th }, locale) || a("chUntitled", locale);
                return (
                  <li key={d.key}>
                    <Link href={contentPath(def, d.id)} className={LINK}>
                      <ConsoleIcon name="draft" />
                      <span>
                        {title}
                        <span className="text-sm text-ink-600"> ({a(def.oneKey, locale)})</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ActivityRow({ item, locale }: { item: ActivityItem; locale: Locale }) {
  const actor = item.actorUserId ? item.actorName || a("opActorUnknown", locale) : a("opActorSystem", locale);
  const described = describeAction(item, locale, { actor, entity: item.entityLabel ?? item.entityId });
  const href = entityHref(item.entityType, item.entityId);
  return (
    <li className={ROW}>
      <ConsoleIcon name={described.icon} className="text-ink-600" />
      <div className="min-w-0 flex-[1_1_12rem]">
        <p className="m-0 break-words">{href ? <Link href={href}>{described.text}</Link> : described.text}</p>
        <p className="m-0 text-sm text-ink-600">
          <Timestamp value={item.occurredAt} locale={locale} format="relative" />
        </p>
      </div>
    </li>
  );
}
