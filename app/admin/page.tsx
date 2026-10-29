import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage, EmptyPanel, PageHeader, StatCard } from "@/components/admin/ui";
import { Button, StatusTag, Timestamp } from "@/components/ui";
import { canEditContent } from "@/lib/admin/content/access";
import { CONTENT_TYPES, contentPath } from "@/lib/admin/content/types";
import { loadCaseCounts, loadEditorCounts, loadRecentContent, type CaseCounts, type EditorCounts, type RecentItem } from "@/lib/admin/dashboard/summary";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { buildConsoleNav } from "@/lib/admin/nav";
import { isAuthConfigured } from "@/lib/auth";
import { hasRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/session";
import { accessibleServices, canUseCaseInbox } from "@/lib/cases/access";
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
  const [caseCounts, editorCounts, recent] = await Promise.all([
    cases && services[0] ? staffActorFor(staff, services[0]).then((actor) => loadCaseCounts(db, actor)) : null,
    editor ? loadEditorCounts(db) : null,
    editor ? loadRecentContent(db) : [],
  ]);

  const nav = buildConsoleNav(staff.roles);
  const iconOf = new Map(nav.groups.flatMap((g) => g.items.map((i) => [i.id, i.icon] as const)));
  const attention = (caseCounts ? caseCounts.overdue + caseCounts.escalated + caseCounts.unassigned : 0) + (editorCounts?.drafts ?? 0);
  const name = staff.user.name || staff.user.email;
  const summary =
    !caseCounts && !editorCounts
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

      {caseCounts || editorCounts ? (
        <section aria-labelledby="needs-you">
          <h2 id="needs-you" className="mb-[var(--space-3)] text-lg font-semibold">
            {a("chNeedsYou", locale)}
          </h2>
          <div className="grid grid-cols-2 gap-[var(--space-3)] lg:grid-cols-3">
            {caseCounts ? <CaseStats counts={caseCounts} locale={locale} /> : null}
            {editorCounts ? <EditorStats counts={editorCounts} locale={locale} /> : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-[var(--space-4)] lg:grid-cols-3">
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
                        <a href={q.href} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
                          <ConsoleIcon name="add" />
                          {createLabel(q)}
                        </a>
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
      <a href={href} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-2)]">
        <ConsoleIcon name={icon} />
        {label}
      </a>
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
        <a href={contentPath(def, item.id)} className="font-medium">
          {title}
        </a>
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
