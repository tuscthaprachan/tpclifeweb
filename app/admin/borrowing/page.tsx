import Link from "next/link";
import { AlarmClock, CalendarCheck, CalendarClock, CircleDollarSign, ClipboardCheck, PackageCheck, PackageMinus, Undo2, type LucideIcon } from "lucide-react";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { DataTable, StatusTag, Timestamp, type DataTableColumn } from "@/components/ui";
import { getAdminLocale } from "@/lib/admin/locale";
import { adminTitle } from "@/lib/admin/metadata";
import { isAuthConfigured } from "@/lib/auth";
import { requireStaff } from "@/lib/auth/session";
import { SERVICES, statusLabel } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { listSchedule, type ScheduleRow } from "@/lib/borrowing/workflow";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { SectionCard } from "../cases/SectionCard";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return adminTitle("brScheduleTitle");
}

interface SectionDef {
  id: string;
  icon: LucideIcon;
  titleKey: AdminKey;
  hintKey: AdminKey;
  rows: ScheduleRow[];
  /** Which time the table leads with. */
  time: "collectAt" | "returnDueAt" | "createdAt";
}

/** What the equipment desk has to do, by when. Everything links to the case, where the step is taken. */
export default async function BorrowingSchedulePage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireStaff([...SERVICES.borrowing.roles]);
  const actor = await staffActorFor(staff, "borrowing");
  const now = new Date();
  const s = await listSchedule(getDb(), actor, now);

  const sections: SectionDef[] = [
    { id: "br-awaiting", icon: ClipboardCheck, titleKey: "brSecAwaiting", hintKey: "brSecAwaitingHint", rows: s.awaitingDecision, time: "createdAt" },
    { id: "br-overdue", icon: AlarmClock, titleKey: "brSecOverdue", hintKey: "brSecOverdueHint", rows: s.overdue, time: "returnDueAt" },
    { id: "br-collect-today", icon: PackageCheck, titleKey: "brSecCollectToday", hintKey: "brSecCollectTodayHint", rows: s.collectionsToday, time: "collectAt" },
    { id: "br-return-today", icon: Undo2, titleKey: "brSecReturnToday", hintKey: "brSecReturnTodayHint", rows: s.returnsToday, time: "returnDueAt" },
    { id: "br-compensation", icon: CircleDollarSign, titleKey: "brSecCompensation", hintKey: "brSecCompensationHint", rows: s.compensationDue, time: "returnDueAt" },
    { id: "br-missed", icon: PackageMinus, titleKey: "brSecMissed", hintKey: "brSecMissedHint", rows: s.collectionsMissed, time: "collectAt" },
    { id: "br-collect-week", icon: CalendarCheck, titleKey: "brSecCollectWeek", hintKey: "brSecCollectWeekHint", rows: s.collectionsNext7, time: "collectAt" },
    { id: "br-return-week", icon: CalendarClock, titleKey: "brSecReturnWeek", hintKey: "brSecReturnWeekHint", rows: s.returnsNext7, time: "returnDueAt" },
  ];

  return (
    <ConsolePage width="wide">
      <PageHeader icon="borrowSchedule" title={a("brScheduleTitle", locale)} description={a("brScheduleIntro", locale)} />

      <nav aria-label={a("brSecNav", locale)}>
        <ul className="m-0 flex list-none flex-wrap gap-x-[var(--space-5)] gap-y-[var(--space-2)] p-0">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>
                {a(section.titleKey, locale)} ({section.rows.length})
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map((section) => (
        <SectionCard key={section.id} id={section.id} icon={section.icon} title={`${a(section.titleKey, locale)} (${section.rows.length})`} description={a(section.hintKey, locale)}>
          {section.rows.length === 0 ? <p className="m-0 text-ink-600">{a("brSecEmpty", locale)}</p> : <Table section={section} locale={locale} />}
        </SectionCard>
      ))}
    </ConsolePage>
  );
}

function Table({ section, locale }: { section: SectionDef; locale: Locale }) {
  const timeHeader: Record<SectionDef["time"], AdminKey> = { collectAt: "brColCollect", returnDueAt: "brColReturn", createdAt: "brColRequested" };
  const columns: DataTableColumn<ScheduleRow>[] = [
    {
      id: "reference",
      header: a("brColReference", locale),
      cell: (r) => (
        <Link href={`/admin/cases/${r.caseId}`} className="font-medium">
          {r.reference}
        </Link>
      ),
    },
    { id: "for", header: a("brColFor", locale), cell: (r) => (r.kind === "group" ? (r.groupName ?? "") : a("brForPersonal", locale)) },
    { id: "event", header: a("brColEvent", locale), cell: (r) => r.eventName },
    { id: "items", header: a("brColItems", locale), cell: (r) => r.items.map((i) => `${i.quantity} ${pick({ th: i.nameTh, en: i.nameEn }, locale)}`).join(", ") },
    { id: "time", header: a(timeHeader[section.time], locale), cell: (r) => <Timestamp value={r[section.time]} locale={locale} format="datetime" /> },
    ...(section.id === "br-compensation"
      ? [{ id: "baht", header: a("brRowCompensation", locale), align: "end" as const, cell: (r: ScheduleRow) => (r.compensationBaht == null ? "" : a("brBaht", locale, { baht: r.compensationBaht })) }]
      : [{ id: "status", header: a("brColStatus", locale), cell: (r: ScheduleRow) => <StatusTag tone={r.status === "on_loan" ? "warning" : r.status === "approved" ? "success" : r.status === "compensation_due" ? "error" : "info"} label={pick(statusLabel("borrowing", "loan", r.status), locale)} /> }]),
  ];
  return <DataTable columns={columns} rows={section.rows} getRowKey={(r) => r.caseId} caption={<span className="visually-hidden">{a(section.titleKey, locale)}</span>} />;
}
