import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsoleIcon } from "@/components/admin/icons";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { Button, NotificationBanner, Pagination, Stack, StatusTag, TextInput, Timestamp } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { listRedirects } from "@/lib/redirects/store";
import { RedirectForm } from "./RedirectForm";
import { saveRedirectAction } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const BASE = "/admin/settings/redirects";

export async function generateMetadata() {
  return adminTitle("rdTitle");
}

export default async function RedirectsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; notice?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 200);
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const { rows, total } = await listRedirects(getDb(), { search: q, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `${BASE}?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`.replace(/\?$/, "");
  const L = (key: Parameters<typeof a>[0], values?: Record<string, string | number>) => a(key, locale, values);

  return (
    <ConsolePage width="wide">
      <PageHeader title={L("rdTitle")} icon="redirects" description={L("rdIntro")} />
      <Stack space={6}>
        {query.notice === "saved" || query.notice === "deleted" ? (
          <NotificationBanner variant="success" title={L(query.notice === "saved" ? "rdNoticeSaved" : "rdNoticeDeleted")}>{null}</NotificationBanner>
        ) : null}

        <Card title={L("rdAddHeading")} icon="add" level={2}>
          <RedirectForm locale={locale} action={saveRedirectAction.bind(null, null)} submitLabel={L("rdAdd")} />
        </Card>

        <Card title={L("rdTableCaption")} icon="redirects" level={2} description={L("rdCount", { count: total })}>
          <Stack space={4}>
            <form method="get" action={BASE} role="search" className="flex flex-wrap items-end gap-[var(--space-3)]">
              <TextInput id="rd-search" name="q" type="search" label={L("rdSearchLabel")} defaultValue={q} className="min-w-0 max-w-[28rem] flex-1" />
              <Button type="submit" variant="secondary" icon={<ConsoleIcon name="search" />}>
                {L("rdSearchButton")}
              </Button>
              {q ? (
                <Button href={BASE} variant="quiet">
                  {L("rdClearSearch")}
                </Button>
              ) : null}
            </form>
            <p className="m-0 text-sm text-ink-600">{L("rdHitsNote")}</p>
            {rows.length === 0 ? (
              <p className="m-0">{q ? L("rdNoMatch", { q }) : L("rdEmpty")}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {rows.map((r) => (
                  <li key={r.id} className="grid gap-[var(--space-2)] border-t border-line py-[var(--space-4)] first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto]">
                    <dl className="m-0 grid min-w-0 gap-[var(--space-1)]">
                      <div className="flex min-w-0 flex-wrap gap-x-[var(--space-2)]">
                        <dt className="font-medium">{L("rdColFrom")}</dt>
                        <dd className="m-0 min-w-0 break-all">
                          <code>{r.fromPath}</code>
                        </dd>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-x-[var(--space-2)]">
                        <dt className="font-medium">{L("rdColTo")}</dt>
                        <dd className="m-0 min-w-0 break-all">
                          <code>{r.toPath}</code>
                        </dd>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-[var(--space-4)] gap-y-[var(--space-1)] text-sm text-ink-600">
                        <span className="inline-flex items-center gap-[var(--space-2)]">
                          <span>{L("rdColType")}</span>
                          <StatusTag tone="neutral" label={String(r.status)} />
                        </span>
                        <span>
                          {L("rdColHits")}: {r.hits}
                        </span>
                        <span>
                          {L("rdColLastHit")}: {r.lastHitAt ? <Timestamp value={r.lastHitAt} locale={locale} format="datetime" /> : L("rdNever")}
                        </span>
                        <span>
                          {L("rdColCreated")}: <Timestamp value={r.createdAt} locale={locale} />
                        </span>
                      </div>
                    </dl>
                    <div className="flex flex-wrap items-start gap-[var(--space-2)]">
                      <Button href={`${BASE}/${r.id}`} variant="secondary" size="sm" icon={<ConsoleIcon name="edit" />}>
                        {L("rdEdit")}
                        <span className="visually-hidden"> {r.fromPath}</span>
                      </Button>
                      <Button href={`${BASE}/${r.id}/delete`} variant="secondary" size="sm" icon={<ConsoleIcon name="delete" />}>
                        {L("rdDelete")}
                        <span className="visually-hidden"> {r.fromPath}</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Pagination currentPage={Math.min(page, pages)} totalPages={pages} buildHref={href} locale={locale} />
          </Stack>
        </Card>
      </Stack>
    </ConsolePage>
  );
}
