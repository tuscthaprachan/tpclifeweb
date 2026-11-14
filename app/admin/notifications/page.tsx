import Form from "next/form";
import Link from "next/link";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsolePage, EmptyPanel, FilterChips, FilterDisclosure, PageHeader, Toolbar } from "@/components/admin/ui";
import { Button, NotificationBanner, Pagination, Timestamp } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { NOTIFICATION_KINDS } from "@/lib/db/schema/notifications";
import { a } from "@/lib/i18n/admin";
import { formatNumber } from "@/lib/i18n/format";
import { listNotifications, notificationParams, parseNotificationQuery, type NotificationQuery } from "@/lib/notifications/read";
import { NOTIFICATION_KIND_LABEL, renderNotification } from "@/lib/notifications/render";
import { markAllReadAction, markReadAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("ntTitle");
}

const field = "min-h-[var(--target-min)] rounded-control border border-line-strong bg-surface px-[var(--space-3)] py-[var(--space-2)] text-base text-ink-900";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff();
  const raw = await searchParams;
  const query = parseNotificationQuery(raw);
  const notice = raw.notice === "all" || raw.notice === "one" ? raw.notice : undefined;
  const list = await listNotifications(getDb(), staff.user.id, query);
  const totalPages = Math.max(Math.ceil(list.total / list.pageSize), 1);

  const href = (over: Partial<NotificationQuery>) => {
    const qs = notificationParams({ ...query, page: 1, ...over });
    return qs ? `/admin/notifications?${qs}` : "/admin/notifications";
  };
  const hidden = (
    <>
      <input type="hidden" name="view" value={query.view} />
      {query.kind ? <input type="hidden" name="kind" value={query.kind} /> : null}
      {query.page > 1 ? <input type="hidden" name="page" value={query.page} /> : null}
    </>
  );

  return (
    <ConsolePage width="wide">
      <PageHeader
        icon="notifications"
        title={a("ntTitle", locale)}
        description={a("ntIntro", locale)}
        actions={
          list.unread > 0 ? (
            <form action={markAllReadAction}>
              {hidden}
              <Button type="submit" variant="secondary" icon={<ConsoleIcon name="markAllRead" />}>
                {a("ntMarkAllRead", locale)}
              </Button>
            </form>
          ) : null
        }
      />
      {notice ? (
        <NotificationBanner variant="success" title={a(notice === "all" ? "ntAllMarked" : "ntOneMarked", locale)}>
          {null}
        </NotificationBanner>
      ) : null}
      <Toolbar
        filters={
          <FilterChips
            label={a("ntViewLabel", locale)}
            options={[
              { id: "unread", label: a("ntViewUnread", locale), href: href({ view: "unread" }), count: list.unread },
              { id: "all", label: a("ntViewAll", locale), href: href({ view: "all" }) },
            ]}
            current={query.view}
          />
        }
      />
      <FilterDisclosure label={a("clFilters", locale)} defaultOpen={Boolean(query.kind)}>
      <Form action="" className="flex flex-wrap items-end gap-[var(--space-3)]">
        <input type="hidden" name="view" value={query.view} />
        <div className="flex flex-col gap-[var(--space-1)]">
          <label htmlFor="nt-kind" className="text-sm font-medium">
            {a("ntFilterKind", locale)}
          </label>
          <select id="nt-kind" name="kind" defaultValue={query.kind ?? ""} className={field}>
            <option value="">{a("ntKindAny", locale)}</option>
            {NOTIFICATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {a(NOTIFICATION_KIND_LABEL[k], locale)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary" icon={<ConsoleIcon name="filter" />}>
          {a("ntApply", locale)}
        </Button>
        {query.kind ? (
          <Button href={href({ kind: undefined })} variant="quiet">
            {a("ntClear", locale)}
          </Button>
        ) : null}
      </Form>
      </FilterDisclosure>

      <p className="m-0 text-ink-600" role="status">
        {list.total === 1 ? a("ntCountOne", locale) : a("ntCount", locale, { count: formatNumber(list.total, locale) })}
      </p>
      {list.rows.length === 0 ? (
        query.view === "unread" && !query.kind ? (
          <EmptyPanel icon="notifications" title={a("ntEmptyUnreadTitle", locale)} action={<Button href={href({ view: "all" })} variant="secondary">{a("ntViewAll", locale)}</Button>}>
            {a("ntEmptyUnreadBody", locale)}
          </EmptyPanel>
        ) : (
          <EmptyPanel icon="notifications" title={a("ntEmptyAllTitle", locale)}>
            {query.kind ? a("ntEmptyFilteredBody", locale) : a("ntEmptyAllBody", locale)}
          </EmptyPanel>
        )
      ) : (
        <ul aria-label={a("ntListLabel", locale)} className="m-0 flex list-none flex-col gap-0 p-0">
          {list.rows.map((row) => {
            const { title, body } = renderNotification(row, locale);
            const unread = row.readAt === null;
            return (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-[var(--space-3)] border-b border-line py-[var(--space-3)] first:border-t">
                <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-[var(--space-1)]">
                  <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
                    <a href={`/admin/notifications/open/${row.id}`} className={unread ? "font-semibold" : "font-medium"}>
                      {title}
                    </a>
                    <span className="inline-flex items-center gap-[var(--space-1)] rounded-pill border border-line-strong px-[var(--space-2)] py-[var(--space-1)] text-sm font-medium text-ink-900">
                      <ConsoleIcon name={unread ? "notifications" : "check"} size={14} />
                      {a(unread ? "ntStatusUnread" : "ntStatusRead", locale)}
                    </span>
                  </div>
                  {body ? <p className="m-0">{body}</p> : null}
                  <p className="m-0 text-sm text-ink-600">
                    <Timestamp value={row.createdAt} locale={locale} format="datetime" />
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <Link href={`/admin/notifications/open/${row.id}`} prefetch={false} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)]">
                    <span>{a("ntOpen", locale)}</span>
                    <span className="visually-hidden">: {title}</span>
                  </Link>
                  {unread ? (
                    <form action={markReadAction}>
                      {hidden}
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" variant="quiet">
                        {a("ntMarkRead", locale)}
                        <span className="visually-hidden">: {title}</span>
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination currentPage={list.page} totalPages={totalPages} buildHref={(p) => href({ page: p })} locale={locale} />
    </ConsolePage>
  );
}
