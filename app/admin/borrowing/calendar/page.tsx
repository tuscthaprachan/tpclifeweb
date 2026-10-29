import { AvailabilityMonth, ItemChooser } from "@/components/domain/borrowing";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Card, ConsolePage, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { listInventory } from "@/lib/borrowing/availability";
import { monthAvailability } from "@/lib/borrowing/calendar";
import { addMonths, dayKeyOf, isMonthKey } from "@/lib/borrowing/time";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import { localePath } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("bcalTitle");
}

type Query = { item?: string; month?: string };

/** Staff may look a year back and a year ahead, for checking past loans and planning events. */
const MONTHS_EITHER_WAY = 12;

export default async function BorrowingCalendarPage({ searchParams }: { searchParams: Promise<Query> }) {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireStaff(["equipment_officer", "unit_lead", "admin"]);
  const query = await searchParams;
  const basePath = "/admin/borrowing/calendar";

  if (!isDatabaseConfigured()) {
    return (
      <ConsolePage width="wide">
        <PageHeader icon="events" title={a("bcalTitle", locale)} description={a("bcalIntro", locale)} />
        <p className="m-0">{a("bcalUnavailable", locale)}</p>
      </ConsolePage>
    );
  }

  const db = getDb();
  const now = new Date();
  const thisMonth = dayKeyOf(now).slice(0, 7);
  const first = addMonths(thisMonth, -MONTHS_EITHER_WAY);
  const last = addMonths(thisMonth, MONTHS_EITHER_WAY);
  const month = isMonthKey(query.month) && query.month >= first && query.month <= last ? query.month : thisMonth;
  const slug = query.item?.trim() || null;

  const inventory = await listInventory(db);
  const data = slug ? await monthAvailability(db, slug, month, now, { staff: true }) : null;

  return (
    <ConsolePage width="wide">
      <PageHeader
        icon="events"
        title={a("bcalTitle", locale)}
        description={a("bcalIntro", locale)}
        actions={
          <Button href={localePath(locale, "/borrow/availability")} variant="secondary">
            {a("bcalPublicLink", locale)}
          </Button>
        }
      />
      {data ? (
        <Card title={a("bcalCardTitle", locale)} level={2}>
          <AvailabilityMonth
            locale={locale}
            data={data}
            inventory={inventory}
            basePath={basePath}
            previousMonth={month > first ? addMonths(month, -1) : null}
            nextMonth={month < last ? addMonths(month, 1) : null}
            variant="staff"
            headingLevel={3}
          />
        </Card>
      ) : (
        <Card title={a("bcalPickTitle", locale)} description={slug ? a("bcalNotFound", locale) : a("bcalPickBody", locale)}>
          {inventory.length === 0 ? <p className="m-0">{a("bcalNoItems", locale)}</p> : <ItemChooser locale={locale} inventory={inventory} basePath={basePath} month={month} />}
        </Card>
      )}
    </ConsolePage>
  );
}
