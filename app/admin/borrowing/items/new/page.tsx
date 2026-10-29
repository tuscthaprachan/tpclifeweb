import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Button } from "@/components/ui";
import { ConsoleIcon } from "@/components/admin/icons";
import { getAdminLocale } from "@/lib/admin/locale";
import { isUuid } from "@/lib/admin/content/form-state";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { equipmentCategories } from "@/lib/db/schema/borrowing";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { ItemForm } from "../Forms";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("brInvAddItem");
}

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireStaff(["equipment_officer", "admin"]);
  const { category } = await searchParams;
  const categories = await getDb().select().from(equipmentCategories).orderBy(equipmentCategories.position);

  return (
    <ConsolePage width="content">
      <PageHeader
        icon="borrowInventory"
        title={a("brInvAddItem", locale)}
        description={a("brInvAddItemIntro", locale)}
        actions={
          <Button href="/admin/borrowing/items" variant="secondary" icon={<ConsoleIcon name="back" />}>
            {a("brInvBack", locale)}
          </Button>
        }
      />
      <ItemForm
        locale={locale}
        values={{
          categoryId: category && isUuid(category) ? category : (categories[0]?.id ?? ""),
          nameTh: "",
          nameEn: "",
          hintTh: "",
          hintEn: "",
          unitTh: "อัน",
          unitEn: "item",
          totalQuantity: 1,
          outOfService: 0,
          maxPerRequest: null,
          position: (categories.length + 1) * 10,
          active: true,
        }}
        categories={categories.map((c) => ({ value: c.id, label: pick({ th: c.nameTh, en: c.nameEn }, locale) }))}
      />
    </ConsolePage>
  );
}
