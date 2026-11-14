import Link from "next/link";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage, EmptyPanel, PageHeader, StatCard } from "@/components/admin/ui";
import { Button, StatusTag, Timestamp } from "@/components/ui";
import { canEditContent } from "@/lib/admin/content/access";
import { CONTENT_TYPES, contentPath } from "@/lib/admin/content/types";
import { describeAction, entityHref } from "@/lib/admin/audit/describe";
import { loadRecentActivity, type ActivityItem } from "@/lib/admin/dashboard/activity";
import {
  loadBorrowingCounts,
  loadCaseCounts,
  loadEditorCounts,
  loadMyCases,
  loadMyDrafts,
  loadRecentContent,
  type BorrowingCounts,
  type CaseCounts,
  type EditorCounts,
  type MyCases,
  type MyDraft,
  type RecentItem,
} from "@/lib/admin/dashboard/summary";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { buildConsoleNav } from "@/lib/admin/nav";
import { isAuthConfigured } from "@/lib/auth";
import { hasRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { accessibleServices, canAccessService, canUseCaseInbox } from "@/lib/cases/access";
import { getServiceDef } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { canSeePerformance } from "@/lib/performance/access";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("dashTitle");
}

/** Quick-create shortcuts shown as buttons; the rest go in a compact list. */
const PRIMARY_CREATE = ["create-serviceAlerts", "create-news", "create-events"];

export default async function AdminDashboardPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff();
  const db = getDb();

  const editor = canEditContent(staff.roles);
  const cases = canUseCaseInbox(staff.roles);
  const services = accessibleServices(staff.roles);
  const borrowing = canAccessService(staff.roles, "borrowing");
  const [caseCounts, editorCounts, recent, borrowingCounts, activity, myCases, myDrafts] = await Promise.all([
    cases && services[0] ? staffActorFor(staff, services[0]).then((actor) => loadCaseCounts(db, actor)) : null,
    editor ? loadEditorCounts(db) : null,
    editor ? loadRecentContent(db) : [],
    borrowing ? loadBorrowingCounts(db) : null,
    loadRecentActivity(db, { userId: staff.user.id, roles: staff.roles }),
    cases ? loadMyCases(db, staff.user.id, staff.roles) : [],
    editor ? loadMyDrafts(db, staff.user.id) : [],
  ]);

  const nav = buildConsoleNav(staff.roles);
  const iconOf = new Map(nav.groups.flatMap((g) => g.items.map((i) => [i.id, i.icon] as const)));
  const attention =
    (caseCounts ? caseCounts.overdue + caseCounts.escalated + caseCounts.unassigned : 0) + (editorCounts?.drafts ?? 0) + (borrowingCounts ? borrowingCounts.pending + borrowingCounts.overdue : 0);
  const name = staff.user.name || staff.user.email;
  const summary =
    !caseCounts && !editorCounts && !borrowingCounts
      ? a("chSummaryPlain", locale)
      : attention === 0
        ? a("chSummaryNone", locale)
        : attention === 1
          ? a("chSummaryOne", locale)
          : a("chSummaryMany", locale, { count: formatNumber(attention, locale) });

  const primary = PRIMARY_CREATE.map((id) => nav.quickCreate.find((q) => q.id === id)).filter((q) => q !== undefined);
  const more = nav.quickCreate.filter((q) => !PRIMARY_CREATE.includes(q.id));
  const createLabel = (q: (typeof nav.quickCreate)[number]) => a(q.labelKey, locale, { item: a(q.itemKey, locale) });
  const lostFound = services.includes("lost_found");
  const admin = hasRole(staff.roles, "admin");
  const showShortcuts = cases || editor || canSeePerformance(staff.roles);

  return (
    <ConsolePage width="wide">
      <PageHeader title={a("chGreeting", locale, { name })} description={summary} icon="dashboard" breadcrumbs={false} />

      {caseCounts || editorCounts || borrowingCounts ? (
        <section aria-labelledby="needs-you">
          <h2 id="needs-you" className="mb-[var(--space-3)] text-lg font-semibold">
            {a("chNeedsYou", locale)}
          </h2>
          <div className="grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-3">
            {caseCounts ? <CaseStats counts={caseCounts} locale={locale} /> : null}
            {borrowingCounts ? <BorrowingStats counts={borrowingCounts} locale={locale} /> : null}
            {editorCounts ? <EditorStats counts={editorCounts} locale={locale} /> : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-[var(--space-4)] lg:grid-cols-3">
        {cases || myDrafts.length > 0 || editor ? (
          <Card title={a("opMyWork", locale)} icon="account" className="lg:col-span-1">
            <MyWork cases={myCases} drafts={myDrafts} locale={locale} showDrafts={editor} showCases={cases} />
          </Card>
        ) : null}

        <Card title={a("opActivityTitle", locale)} icon="audit" padded={false} className="lg:col-span-2">
          {activity.length === 0 ? (
            <div className="p-[var(--space-4)]">
              <EmptyPanel icon="info" title={a("opActivityEmpty", locale)} />
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
              <Link href="/admin/audit" className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
                <ConsoleIcon name="audit" />
                {a("opActivityAll", locale)}
              </Link>
            </p>
          ) : null}
        </Card>

        {editor ? (
          <Card title={a("chRecent", locale)} icon="edit" padded={false} className="lg:col-span-2 lg:row-span-2">
            {recent.length === 0 ? (
              <div className="p-[var(--space-4)]">
                <EmptyPanel icon="info" title={a("chRecentEmpty", locale)} />
              </div>
            ) : (
              <ul className="m-0 list-none p-0">
                {recent.map((item) => (
                  <RecentRow key={item.key} item={item} locale={locale} icon={iconOf.get(`content-${item.typeKey}`) ?? "edit"} />
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {primary.length > 0 || more.length > 0 || lostFound ? (
          <Card title={a("chQuickActions", locale)} icon="add">
            <div className="flex flex-col gap-[var(--space-3)]">
              {primary.length > 0 ? (
                <div className="flex flex-wrap gap-[var(--space-2)]">
                  {primary.map((q, i) => (
                    <Button key={q.id} href={q.href} variant={i === 0 ? "primary" : "secondary"} icon={<ConsoleIcon name="add" />}>
                      {createLabel(q)}
                    </Button>
                  ))}
                </div>
              ) : null}
              {lostFound ? (
                <div>
                  <p className="m-0 mb-[var(--space-2)] text-sm font-semibold text-ink-600">{a("chCaseDesk", locale)}</p>
                  <div className="flex flex-wrap gap-[var(--space-2)]">
                    <Button href="/admin/cases/new/found" variant="secondary" icon={<ConsoleIcon name="lostFound" />}>
                      {a("lfcInboxLogFound", locale)}
                    </Button>
                    <Button href="/admin/cases/new/lost" variant="secondary" icon={<ConsoleIcon name="lostFound" />}>
                      {a("lfcInboxLogLost", locale)}
                    </Button>
                  </div>
                </div>
              ) : null}
              {more.length > 0 ? (
                <details>
                  <summary className="min-h-[var(--target-min)] cursor-pointer py-[var(--space-2)] text-sm font-semibold">{a("chMore", locale)}</summary>
                  <ul className="m-0 grid list-none gap-[var(--space-1)] p-0">
                    {more.map((q) => (
                      <li key={q.id}>
                        <Link href={q.href} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
                          <ConsoleIcon name="add" />
                          {createLabel(q)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </Card>
        ) : null}

        {showShortcuts ? (
          <Card title={a("chGoTo", locale)} icon="chevronRight">
            <ul className="m-0 grid list-none gap-[var(--space-1)] p-0">
              {cases ? <ShortcutLink href="/admin/cases" icon="cases" label={a("casesTitle", locale)} /> : null}
              {editor ? <ShortcutLink href="/admin/content" icon="dashboard" label={a("dashAllContent", locale)} /> : null}
              {canSeePerformance(staff.roles) ? <ShortcutLink href="/admin/performance" icon="performance" label={a("pfTitle", locale)} /> : null}
            </ul>
          </Card>
        ) : null}

        {admin ? (
          <Card title={a("chSettings", locale)} icon="siteSettings">
            <ul className="m-0 grid list-none gap-[var(--space-1)] p-0">
              <ShortcutLink href="/admin/staff" icon="staff" label={a("staffLink", locale)} />
              <ShortcutLink href="/admin/complaints/categories" icon="complaintCategories" label={a("cpcatLink", locale)} />
            </ul>
          </Card>
        ) : null}
      </div>
    </ConsolePage>
  );
}

function ShortcutLink({ href, icon, label }: { href: string; icon: Parameters<typeof ConsoleIcon>[0]["name"]; label: string }) {
  return (
    <li>
      <Link href={href} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
        <ConsoleIcon name={icon} />
        {label}
      </Link>
    </li>
  );
}

function CaseStats({ counts, locale }: { counts: CaseCounts; locale: "th" | "en" }) {
  const n = (v: number) => formatNumber(v, locale);
  return (
    <>
      {counts.complaints ? (
        <StatCard
          icon="overdue"
          label={a("chStatOverdue", locale)}
          value={n(counts.overdue)}
          hint={counts.overdue > 0 ? a("chHintOverdue", locale) : undefined}
          tone={counts.overdue > 0 ? "attention" : "neutral"}
          href="/admin/cases?service=complaint&open=1&overdue=1"
        />
      ) : null}
      {counts.complaints ? (
        <StatCard
          icon="escalated"
          label={a("chStatEscalated", locale)}
          value={n(counts.escalated)}
          hint={counts.escalated > 0 ? a("chHintEscalated", locale) : undefined}
          tone={counts.escalated > 0 ? "attention" : "neutral"}
          href="/admin/cases?escalated=1&open=1"
        />
      ) : null}
      <StatCard
        icon="cases"
        label={a("chStatUnassigned", locale)}
        value={n(counts.unassigned)}
        hint={counts.unassigned > 0 ? a("chHintUnassigned", locale) : undefined}
        tone={counts.unassigned > 0 ? "attention" : "neutral"}
        href="/admin/cases?assignee=unassigned&open=1"
      />
      <StatCard icon="account" label={a("chStatMine", locale)} value={n(counts.mine)} hint={a("chHintMine", locale)} href="/admin/cases?assignee=me&open=1" />
      <StatCard icon="cases" label={a("chStatOpen", locale)} value={n(counts.open)} hint={a("chHintOpen", locale)} href="/admin/cases?open=1" />
    </>
  );
}

function EditorStats({ counts, locale }: { counts: EditorCounts; locale: "th" | "en" }) {
  const alerts = CONTENT_TYPES.find((d) => d.key === "serviceAlerts")!;
  return (
    <>
      <StatCard icon="draft" label={a("chStatDrafts", locale)} value={formatNumber(counts.drafts, locale)} hint={a("chHintDrafts", locale)} href="/admin/content" />
      <StatCard icon="alerts" label={a("chStatAlerts", locale)} value={formatNumber(counts.liveAlerts, locale)} hint={a("chHintAlerts", locale)} href={contentPath(alerts)} />
    </>
  );
}

function RecentRow({ item, locale, icon }: { item: RecentItem; locale: "th" | "en"; icon: Parameters<typeof ConsoleIcon>[0]["name"] }) {
  const def = CONTENT_TYPES.find((d) => d.key === item.typeKey)!;
  const title = pick(item.title, locale) || pick({ th: item.title.en, en: item.title.th }, locale) || a("chUntitled", locale);
  return (
    <li className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-t border-line px-[var(--space-4)] py-[var(--space-2)] first:border-t-0">
      <ConsoleIcon name={icon} className="text-ink-600" />
      <div className="min-w-0 flex-1">
        <Link href={contentPath(def, item.id)} className="font-medium">
          {title}
        </Link>
        <p className="m-0 text-sm text-ink-600">
          {a(def.oneKey, locale)}
          {" · "}
          <Timestamp value={item.updatedAt} locale={locale} format="relative" />
        </p>
      </div>
      {item.status ? <StatusTag tone={item.status === "published" ? "success" : "neutral"} label={a(item.status === "published" ? "statusPublished" : "statusDraft", locale)} /> : null}
    </li>
  );
}

function BorrowingStats({ counts, locale }: { counts: BorrowingCounts; locale: "th" | "en" }) {
  const n = (v: number) => formatNumber(v, locale);
  return (
    <>
      <StatCard
        icon="borrowSchedule"
        label={a("opStatBorrowPending", locale)}
        value={n(counts.pending)}
        hint={counts.pending > 0 ? a("opHintBorrowPending", locale) : undefined}
        tone={counts.pending > 0 ? "attention" : "neutral"}
        href="/admin/borrowing"
      />
      <StatCard icon="borrowCalendar" label={a("opStatBorrowDue", locale)} value={n(counts.dueToday)} hint={a("opHintBorrowDue", locale)} href="/admin/borrowing" />
      <StatCard
        icon="overdue"
        label={a("opStatBorrowOverdue", locale)}
        value={n(counts.overdue)}
        hint={counts.overdue > 0 ? a("opHintBorrowOverdue", locale) : undefined}
        tone={counts.overdue > 0 ? "attention" : "neutral"}
        href="/admin/borrowing"
      />
    </>
  );
}

function MyWork({ cases, drafts, locale, showCases, showDrafts }: { cases: MyCases[]; drafts: MyDraft[]; locale: "th" | "en"; showCases: boolean; showDrafts: boolean }) {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {showCases ? (
        <div>
          <h3 className="m-0 mb-[var(--space-2)] text-base font-semibold">{a("opMyCases", locale)}</h3>
          <ul className="m-0 grid list-none gap-[var(--space-1)] p-0">
            {cases.map((c) => (
              <li key={c.service}>
                <Link href={`/admin/cases?assignee=me&open=1&service=${c.service}`} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
                  <ConsoleIcon name="cases" />
                  <span>{a("opMyCasesRow", locale, { service: pick(getServiceDef(c.service).label, locale), count: formatNumber(c.open, locale) })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {showDrafts ? (
        <div>
          <h3 className="m-0 mb-[var(--space-2)] text-base font-semibold">{a("opMyDrafts", locale)}</h3>
          {drafts.length === 0 ? (
            <p className="m-0 text-sm text-ink-600">{a("opMyDraftsEmpty", locale)}</p>
          ) : (
            <ul className="m-0 grid list-none gap-[var(--space-1)] p-0">
              {drafts.map((d) => {
                const def = CONTENT_TYPES.find((t) => t.key === d.typeKey)!;
                const title = pick(d.title, locale) || pick({ th: d.title.en, en: d.title.th }, locale) || a("chUntitled", locale);
                return (
                  <li key={d.key}>
                    <Link href={contentPath(def, d.id)} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
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

function ActivityRow({ item, locale }: { item: ActivityItem; locale: "th" | "en" }) {
  const actor = item.actorUserId ? item.actorName || a("opActorUnknown", locale) : a("opActorSystem", locale);
  const described = describeAction(item, locale, { actor, entity: item.entityLabel ?? item.entityId });
  const href = entityHref(item.entityType, item.entityId);
  return (
    <li className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-t border-line px-[var(--space-4)] py-[var(--space-2)] first:border-t-0">
      <ConsoleIcon name={described.icon} className="text-ink-600" />
      <div className="min-w-0 flex-1">
        <p className="m-0 break-words">{href ? <Link href={href}>{described.text}</Link> : described.text}</p>
        <p className="m-0 text-sm text-ink-600">
          <Timestamp value={item.occurredAt} locale={locale} format="relative" />
        </p>
      </div>
    </li>
  );
}
