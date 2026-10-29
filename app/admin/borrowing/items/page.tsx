import { Package, Plus } from "lucide-react";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button, DataTable, Details, NotificationBanner, Tag, type DataTableColumn } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { listInventory } from "@/lib/borrowing/availability";
import { getDb } from "@/lib/db";
import type { EquipmentItemRow } from "@/lib/db/schema/borrowing";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { SectionCard } from "../../cases/SectionCard";
import { CategoryForm } from "./Forms";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("brInvTitle");
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireStaff(["equipment_officer", "admin"]);
  const { added } = await searchParams;
  const inventory = await listInventory(getDb());

  return (
    <ConsolePage width="wide">
      <PageHeader
        icon="borrowInventory"
        title={a("brInvTitle", locale)}
        description={a("brInvIntro", locale)}
        actions={
          <Button href="/admin/borrowing/items/new" icon={<Plus aria-hidden="true" size={18} />}>
            {a("brInvAddItem", locale)}
          </Button>
        }
      />
      {added ? (
        <NotificationBanner variant="success" title={a("brInvSavedItem", locale)}>
          {null}
        </NotificationBanner>
      ) : null}

      {inventory.map((category) => (
        <SectionCard key={category.id} id={`inv-${category.id}`} icon={Package} title={pick({ th: category.nameTh, en: category.nameEn }, locale)}>
          <p className="m-0 flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)] text-ink-600">
            <span>{a("brInvCategorySummary", locale, { notice: category.noticeWorkingDays, cards: category.depositCards })}</span>
            {category.maxPerRequest !== null ? <span>{a("brInvCategoryCap", locale, { max: category.maxPerRequest })}</span> : null}
            {!category.active ? <Tag tone="neutral">{a("brInvInactive", locale)}</Tag> : null}
          </p>
          <Items items={category.items} locale={locale} caption={pick({ th: category.nameTh, en: category.nameEn }, locale)} />
          <div>
            <Button href={`/admin/borrowing/items/new?category=${category.id}`} variant="secondary" icon={<Plus aria-hidden="true" size={18} />}>
              {a("brInvAddItemTo", locale)}
            </Button>
          </div>
          <Details summary={a("brInvEditCategory", locale)}>
            <CategoryForm locale={locale} values={category} />
          </Details>
        </SectionCard>
      ))}
    </ConsolePage>
  );
}

function Items({ items, locale, caption }: { items: EquipmentItemRow[]; locale: Locale; caption: string }) {
  if (items.length === 0) return <p className="m-0 text-ink-600">{a("brInvNoItems", locale)}</p>;
  const columns: DataTableColumn<EquipmentItemRow>[] = [
    {
      id: "name",
      header: a("brInvColItem", locale),
      cell: (i) => (
        <span className="flex flex-wrap items-center gap-x-[var(--space-2)]">
          <a href={`/admin/borrowing/items/${i.id}`} className="font-medium">
            {pick({ th: i.nameTh, en: i.nameEn }, locale)}
            <span className="visually-hidden"> {a("brInvEditItem", locale)}</span>
          </a>
          {!i.active ? <Tag tone="neutral">{a("brInvInactive", locale)}</Tag> : null}
        </span>
      ),
    },
    { id: "total", header: a("brInvColTotal", locale), align: "end", cell: (i) => String(i.totalQuantity) },
    { id: "oos", header: a("brInvColOutOfService", locale), align: "end", cell: (i) => String(i.outOfService) },
    { id: "lendable", header: a("brInvColLendable", locale), align: "end", cell: (i) => String(Math.max(0, i.totalQuantity - i.outOfService)) },
    { id: "max", header: a("brInvColMax", locale), align: "end", cell: (i) => (i.maxPerRequest === null ? a("caseNone", locale) : String(i.maxPerRequest)) },
  ];
  return <DataTable columns={columns} rows={items} getRowKey={(i) => i.id} caption={<span className="visually-hidden">{caption}</span>} />;
}
