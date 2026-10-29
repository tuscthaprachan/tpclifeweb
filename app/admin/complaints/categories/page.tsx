import { sql } from "drizzle-orm";
import { Clock, Lock, Plus, Tag as TagIcon } from "lucide-react";
import { ConsoleIcon } from "@/components/admin/icons";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, Details, StatusTag, Tag } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { staffActorFor } from "@/lib/cases/staff";
import { listCategories, listCategoryAccess, listNameableStaff } from "@/lib/complaints/categories";
import { getDb } from "@/lib/db";
import { complaintCases } from "@/lib/db/schema/complaints";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { Glyph, SectionCard } from "../../cases/SectionCard";
import { AccessList, CategoryForm } from "./Forms";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("cpcatTitle");
}

export default async function ComplaintCategoriesPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff(["admin"]);
  const db = getDb();
  const actor = await staffActorFor(staff, "complaint");
  const [categories, nameable, counts] = await Promise.all([
    listCategories(db),
    listNameableStaff(db, actor),
    db.select({ id: complaintCases.categoryId, n: sql<number>`count(*)::int` }).from(complaintCases).groupBy(complaintCases.categoryId),
  ]);
  const held = new Map(counts.map((c) => [c.id, c.n]));
  const candidates = nameable.map((p) => ({ value: p.id, label: `${p.name || p.email} (${p.email})` }));
  const access = new Map(await Promise.all(categories.map(async (c) => [c.id, await listCategoryAccess(db, c.id, actor)] as const)));

  return (
    <ConsolePage width="content">
      <PageHeader
        icon="complaintCategories"
        title={a("cpcatTitle", locale)}
        description={a("cpcatIntro", locale)}
        actions={
          <Button href="#cpcat-new" icon={<ConsoleIcon name="add" />}>
            {a("cpcatNewHeading", locale)}
          </Button>
        }
      />

      <ul className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
        {categories.map((c) => {
          const named = access.get(c.id) ?? [];
          return (
            <li key={c.id}>
              <SectionCard id={`cat-card-${c.id}`} icon={c.restricted ? Lock : TagIcon} title={pick({ th: c.nameTh, en: c.nameEn }, locale)}>
                <div className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-2)]">
                  <span className="inline-flex items-center gap-[var(--space-1)]">
                    <Glyph icon={Clock} size={16} className="text-ink-600" />
                    {a("cpcTargetsText", locale, { ack: c.acknowledgeDays, resolve: c.resolveDays })}
                  </span>
                  <span className="text-ink-600">{a("cpcatCases", locale, { count: held.get(c.id) ?? 0 })}</span>
                  {c.restricted ? (
                    <Tag tone="governance">
                      <Glyph icon={Lock} size={14} className="me-[var(--space-1)] inline" />
                      {a("cpcRestricted", locale)}
                    </Tag>
                  ) : null}
                  {!c.active ? <Tag tone="neutral">{a("cpcatInactive", locale)}</Tag> : null}
                  {c.restricted && named.length === 0 ? <StatusTag tone="error" label={a("cpcatNobodyNamedTag", locale)} /> : null}
                </div>
                <Details summary={a("cpcatNamedHeading", locale)}>
                  <div className="flex flex-col gap-[var(--space-3)]">
                    <p className="m-0 text-ink-600">{a("cpcatNamedHint", locale)}</p>
                    <AccessList locale={locale} categoryId={c.id} named={named} candidates={candidates} />
                  </div>
                </Details>
                <Details summary={a("cpcatEditHeading", locale)}>
                  <CategoryForm locale={locale} hasCases={(held.get(c.id) ?? 0) > 0 && c.restricted} values={c} />
                </Details>
              </SectionCard>
            </li>
          );
        })}
      </ul>

      <SectionCard id="cpcat-new" icon={Plus} title={a("cpcatNewHeading", locale)}>
        <CategoryForm locale={locale} values={{ nameTh: "", nameEn: "", hintTh: "", hintEn: "", acknowledgeDays: 2, resolveDays: 10, restricted: false, offerWellbeing: false, position: (categories.length + 1) * 10, active: true }} />
      </SectionCard>
    </ConsolePage>
  );
}
