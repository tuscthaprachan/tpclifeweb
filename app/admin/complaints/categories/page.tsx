import { sql } from "drizzle-orm";
import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Details, Heading, StatusTag, Tag } from "@/components/ui";
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
    <AdminPage width="content">
      <div>
        <a href="/admin">{a("homeLink", locale)}</a>
        <Heading level={1} className="mt-[var(--space-2)]">
          {a("cpcatTitle", locale)}
        </Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("cpcatIntro", locale)}</p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-[var(--space-4)] p-0">
        {categories.map((c) => {
          const named = access.get(c.id) ?? [];
          return (
            <li key={c.id}>
              <Details
                summary={
                  <span className="inline-flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
                    {pick({ th: c.nameTh, en: c.nameEn }, locale)}
                    {c.restricted ? <Tag tone="governance">{a("cpcRestricted", locale)}</Tag> : null}
                    {!c.active ? <Tag tone="neutral">{a("cpcatInactive", locale)}</Tag> : null}
                    {c.restricted && named.length === 0 ? <StatusTag tone="error" label={a("cpcatNobodyNamedTag", locale)} /> : null}
                  </span>
                }
              >
                <div className="flex flex-col gap-[var(--space-6)]">
                  <p className="m-0 text-ink-600">
                    {a("cpcTargetsText", locale, { ack: c.acknowledgeDays, resolve: c.resolveDays })}
                    {" · "}
                    {a("cpcatCases", locale, { count: held.get(c.id) ?? 0 })}
                  </p>
                  <div>
                    <Heading level={3}>{a("cpcatNamedHeading", locale)}</Heading>
                    <p className="mt-[var(--space-1)] text-ink-600">{a("cpcatNamedHint", locale)}</p>
                    <div className="mt-[var(--space-3)]">
                      <AccessList locale={locale} categoryId={c.id} named={named} candidates={candidates} />
                    </div>
                  </div>
                  <div>
                    <Heading level={3}>{a("cpcatEditHeading", locale)}</Heading>
                    <div className="mt-[var(--space-3)]">
                      <CategoryForm locale={locale} hasCases={(held.get(c.id) ?? 0) > 0 && c.restricted} values={c} />
                    </div>
                  </div>
                </div>
              </Details>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="cpcat-new">
        <Heading level={2} id="cpcat-new">
          {a("cpcatNewHeading", locale)}
        </Heading>
        <div className="mt-[var(--space-3)]">
          <CategoryForm locale={locale} values={{ nameTh: "", nameEn: "", hintTh: "", hintEn: "", acknowledgeDays: 2, resolveDays: 10, restricted: false, offerWellbeing: false, position: (categories.length + 1) * 10, active: true }} />
        </div>
      </section>
    </AdminPage>
  );
}
