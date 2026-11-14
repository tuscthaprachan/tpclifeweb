import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FormPageHeader } from "@/app/admin/content/_list/FormPageHeader";
import { ConsoleIcon } from "@/components/admin/icons";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { RevisionDiff } from "@/components/admin/content/RevisionDiff";
import { Card, ConsolePage, FormLayout } from "@/components/admin/ui";
import { Button, NotificationBanner, Select, Stack, StatusTag, Timestamp } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isRevertibleSegment } from "@/lib/admin/content/capabilities";
import { diffSnapshots } from "@/lib/admin/content/diff";
import { isUuid } from "@/lib/admin/content/form-state";
import { getRevision, listRevisions } from "@/lib/admin/content/history";
import { restoreItem } from "@/lib/admin/content/lifecycle-actions";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("clcHistoryTitle");
}

const positive = (value: string | undefined): number | null => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const RESTORE_ERROR = { slug: "clcErrRestoreSlug", inUse: "clcErrRestoreInUse", gone: "clcErrRestoreGone" } as const;

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ v?: string; with?: string; restore?: string }>;
}) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { type, id } = await params;
  const def = getContentType(type);
  if (!def || def.kind !== "collection" || !isUuid(id)) notFound();
  const query = await searchParams;

  const db = getDb();
  const table = def.table as unknown as { id: Parameters<typeof eq>[0] };
  const [row] = await db.select().from(def.table).where(eq(table.id, id)).limit(1);
  if (!row) notFound();

  const revisions = await listRevisions(db, def, id);
  const latest = revisions[0];
  const selectedNumber = positive(query.v);
  const selected = revisions.find((r) => r.revisionNumber === selectedNumber) ?? (selectedNumber === null ? revisions[1] : undefined);
  const againstNumber = positive(query.with);
  const against = revisions.find((r) => r.revisionNumber === againstNumber) ?? latest;

  const [selectedRow, againstRow] =
    selected && against && selected.revisionNumber !== against.revisionNumber
      ? await Promise.all([getRevision(db, def, id, selected.revisionNumber), getRevision(db, def, id, against.revisionNumber)])
      : [undefined, undefined];
  const diff = selectedRow && againstRow ? diffSnapshots(selectedRow.revision, againstRow.revision) : null;

  const base = `${contentPath(def, id)}/history`;
  const href = (v: number) => `${base}?v=${v}`;
  const L = (key: Parameters<typeof a>[0], values?: Record<string, string | number>) => a(key, locale, values);
  const canRestore = isRevertibleSegment(type) && selected && latest && selected.revisionNumber !== latest.revisionNumber && !selected.deleted;
  const restoreError = RESTORE_ERROR[(query.restore ?? "") as keyof typeof RESTORE_ERROR];

  const list = (
    <Card title={L("clcRevisionList")} icon="history" level={2}>
      {revisions.length === 0 ? (
        <p className="m-0">{L("clcNoRevisions")}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-[var(--space-3)] p-0">
          {revisions.map((r) => {
            const isSelected = r.revisionNumber === selected?.revisionNumber;
            return (
              <li key={r.id} className="flex flex-col gap-[var(--space-1)]">
                <div className="flex flex-wrap items-center gap-[var(--space-2)]">
                  <a href={href(r.revisionNumber)} aria-current={isSelected ? "true" : undefined} className={isSelected ? "font-bold" : undefined}>
                    {L("clcVersion", { n: r.revisionNumber })}
                  </a>
                  {r.revisionNumber === latest?.revisionNumber ? <StatusTag tone="info" label={L("clcCurrent")} /> : null}
                  {r.deleted ? <StatusTag tone="error" label={L("clcDeletedRecord")} /> : r.status ? <StatusTag tone={r.status === "published" ? "success" : "neutral"} label={L(r.status === "published" ? "statusPublished" : "statusDraft")} /> : null}
                </div>
                <p className="m-0 text-sm text-ink-600">
                  <Timestamp value={r.createdAt} locale={locale} format="datetime" />
                  {" · "}
                  {r.createdByName ? L("clcSavedBy", { name: r.createdByName }) : L("clcSavedBySystem")}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );

  return (
    <ConsolePage width="wide">
      <FormPageHeader
        def={def}
        locale={locale}
        mode="edit"
        title={L("clcHistoryTitle")}
        trail={[{ label: L("editItem", { item: L(def.oneKey) }), href: contentPath(def, id) }]}
        description={L("clcHistoryIntro")}
        actions={
          <Button href={contentPath(def, id)} variant="secondary" icon={<ConsoleIcon name="back" />}>
            {L("clcBackToEdit")}
          </Button>
        }
      />
      <FormLayout aside={list}>
        <Stack space={6}>
          {restoreError ? (
            <NotificationBanner variant="warning" title={L("clcRestoreTitle")}>
              {L(restoreError)}
            </NotificationBanner>
          ) : null}
          {!selected ? (
            <p className="m-0">{revisions.length > 1 ? L("clcCompare") : revisions.length === 1 ? L("clcThisIsCurrent") : L("clcNoRevisions")}</p>
          ) : selected.revisionNumber === against?.revisionNumber ? (
            <p className="m-0">{L("clcThisIsCurrent")}</p>
          ) : (
            <>
              <h2 className="m-0 text-lg font-semibold">
                {againstNumber && against && against.revisionNumber !== latest?.revisionNumber
                  ? L("clcComparingOther", { from: selected.revisionNumber, to: against.revisionNumber })
                  : L("clcComparing", { n: selected.revisionNumber })}
              </h2>
              {diff ? <RevisionDiff diff={diff} locale={locale} /> : null}
              <form method="get" className="flex flex-wrap items-end gap-[var(--space-3)]">
                <input type="hidden" name="v" value={selected.revisionNumber} />
                <Select
                  id="compare-with"
                  name="with"
                  label={L("clcCompareWith")}
                  defaultValue={against?.revisionNumber}
                  options={revisions.filter((r) => r.revisionNumber !== selected.revisionNumber).map((r) => ({ value: String(r.revisionNumber), label: L("clcVersion", { n: r.revisionNumber }) }))}
                />
                <Button type="submit" variant="secondary">
                  {L("clcCompareGo")}
                </Button>
              </form>
              {canRestore ? (
                <Card title={L("clcRestoreTitle")} icon="restore" level={3}>
                  <form action={restoreItem}>
                    <input type="hidden" name="segment" value={type} />
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="revision" value={selected.revisionNumber} />
                    <Stack space={3}>
                      <p className="m-0 text-ink-600">{L("clcRestoreHint")}</p>
                      <div className="flex flex-wrap gap-[var(--space-3)]">
                        <Button type="submit" name="publish" value="draft" variant="secondary" icon={<ConsoleIcon name="draft" />}>
                          {L("clcRestoreDraft")}
                        </Button>
                        <Button type="submit" name="publish" value="publish" icon={<ConsoleIcon name="publish" />}>
                          {L("clcRestorePublish")}
                        </Button>
                      </div>
                    </Stack>
                  </form>
                </Card>
              ) : isRevertibleSegment(type) ? null : (
                <p className="m-0 text-ink-600">{L("clcRestoreUnavailable")}</p>
              )}
            </>
          )}
        </Stack>
      </FormLayout>
    </ConsolePage>
  );
}
