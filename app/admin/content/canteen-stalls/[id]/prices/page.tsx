import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { ContentForm } from "@/components/admin/content/ContentForm";
import { CheckboxField, DateField, TextField } from "@/components/admin/content/fields";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { EmptyState, Heading, NotificationBanner } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { isUuid } from "@/lib/admin/content/form-state";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { canteenStalls } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { pick } from "@/lib/i18n/config";
import { stallPriceSheet } from "../../prices";
import { todayBangkok } from "../../shared";
import { saveStallPrices } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("canteenPricesTitle", locale) };
}

/** Every dish of one stall with a price box, saved in one go. */
export default async function StallPricesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { saved } = await searchParams;
  const db = getDb();
  const [stall] = await db.select().from(canteenStalls).where(eq(canteenStalls.id, id));
  if (!stall) notFound();
  const dishes = await stallPriceSheet(db, id);
  const stallName = pick({ th: stall.nameTh || stall.nameEn, en: stall.nameEn || stall.nameTh }, locale);
  const dishesHref = `${contentPath(getContentType("canteen-dishes")!)}?stall=${id}`;

  return (
    <AdminPage width="content">
      <Heading level={1}>{a("canteenPricesHeading", locale, { number: stall.number, name: stallName })}</Heading>
      <p className="m-0">{a("canteenPricesIntro", locale)}</p>
      {saved !== undefined ? (
        <NotificationBanner variant="success" title={a(saved === "0" ? "canteenPricesNoChange" : "canteenPricesSaved", locale, { count: Number(saved) || 0 })}>
          {a("canteenPricesSavedNote", locale)}
        </NotificationBanner>
      ) : null}
      {dishes.length === 0 ? (
        <EmptyState title={a("canteenPricesEmpty", locale)} />
      ) : (
        <ContentForm key={`${saved}-${dishes.map((d) => d.price).join(",")}`} locale={locale} action={saveStallPrices.bind(null, id)} listHref={`${contentPath(getContentType("canteen-stalls")!, id)}`} hasStatus={false}>
          <DateField name="checkedOn" label={a("canteenFieldCheckedOn", locale)} hint={a("canteenHintPricesDate", locale)} defaultValue={todayBangkok()} />
          <CheckboxField name="confirmAll" label={a("canteenFieldConfirmAll", locale)} hint={a("canteenHintConfirmAll", locale)} />
          <div className="grid gap-[var(--space-4)] md:grid-cols-2">
            {dishes.map((dish) => (
              <TextField
                key={dish.id}
                name={`price.${dish.id}`}
                label={`${dish.menuNumber ? `${dish.menuNumber}. ` : ""}${pick({ th: dish.nameTh || dish.nameEn, en: dish.nameEn || dish.nameTh }, locale)}`}
                hint={a("canteenPriceCheckedHint", locale, { date: dish.checkedOn })}
                inputMode="numeric"
                className="max-w-[16rem]"
                defaultValue={String(dish.price)}
              />
            ))}
          </div>
        </ContentForm>
      )}
      <p className="m-0">
        <a href={dishesHref}>{a("canteenPricesToDishes", locale)}</a>
      </p>
    </AdminPage>
  );
}
