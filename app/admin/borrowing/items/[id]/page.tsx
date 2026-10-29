import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
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
import { equipmentCategories, equipmentItems } from "@/lib/db/schema/borrowing";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { ItemForm } from "../Forms";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("brInvEditItem");
}

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireStaff(["equipment_officer", "admin"]);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const db = getDb();
  const [item] = await db.select().from(equipmentItems).where(eq(equipmentItems.id, id));
  if (!item) notFound();
  const categories = await db.select().from(equipmentCategories).orderBy(equipmentCategories.position);

  return (
    <ConsolePage width="content">
      <PageHeader
        icon="borrowInventory"
        title={pick({ th: item.nameTh, en: item.nameEn }, locale)}
        description={a("brInvEditItemIntro", locale)}
        actions={
          <Button href="/admin/borrowing/items" variant="secondary" icon={<ConsoleIcon name="back" />}>
            {a("brInvBack", locale)}
          </Button>
        }
      />
      <ItemForm locale={locale} values={item} categories={categories.map((c) => ({ value: c.id, label: pick({ th: c.nameTh, en: c.nameEn }, locale) }))} />
    </ConsolePage>
  );
}
