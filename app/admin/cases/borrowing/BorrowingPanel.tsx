import type { ReactNode } from "react";
import { CalendarClock, ListChecks, Lock, Package, Table2 } from "lucide-react";
import { DataTable, Heading, StatusTag, SummaryList, Timestamp, type DataTableColumn } from "@/components/ui";
import { overlappingCases } from "@/lib/borrowing/availability";
import { readLoanFacts, type LoanFacts, type LoanLineFact } from "@/lib/borrowing/workflow";
import { requireStaff } from "@/lib/auth/session";
import { SERVICES, statusLabel } from "@/lib/cases/services";
import { staffActorFor } from "@/lib/cases/staff";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CasePanelProps } from "../panels";
import { SectionCard } from "../SectionCard";
import { ApproveForm, CancelForm, DeclineForm, DetailsReveal, HandoverForm, NotCollectedButton, ReturnForm, SettleForm, type FormLine } from "./Forms";

const DEPOSIT_LABEL = { student_card: "brDepositStudentCard", national_id_card: "brDepositIdCard", other: "brDepositOther" } as const satisfies Record<string, AdminKey>;
const SETTLEMENT_LABEL = { paid: "brSettlePaid", replaced: "brSettleReplaced", waived: "brSettleWaived" } as const satisfies Record<string, AdminKey>;

/**
 * The equipment loan part of the case page (registered in ./panels.ts): who it
 * is for and what for, the items with how many are free for the period
 * without this request, other requests that clash, the logged "Show" for the
 * student number, and the one step the status allows. The decision, handover
 * and return are here and nowhere else, so the generic status form is hidden
 * for loans. Nothing is decrypted here; `readLoanFacts` checks access again.
 */
export async function BorrowingPanel(props: CasePanelProps) {
  const staff = await requireStaff([...SERVICES.borrowing.roles]);
  const actor = await staffActorFor(staff, "borrowing", props.organisationId);
  const db = getDb();
  const { locale, caseId, status } = props;
  const now = new Date();
  const facts = await readLoanFacts(db, caseId, actor, { now });
  const holding = status === "requested" || status === "approved";
  const clashes = holding ? await overlappingCases(db, caseId, facts.lines.map((l) => l.itemId), facts.collectAt, facts.returnDueAt) : [];
  const base = { locale, caseId, orgId: actor.organisationId };
  const formLines: FormLine[] = facts.lines.map((l) => ({ lineId: l.lineId, name: { th: l.nameTh, en: l.nameEn }, unit: { th: l.unitTh, en: l.unitEn }, quantity: l.quantity, free: l.free }));
  const itemName = new Map(facts.lines.map((l) => [l.itemId, pick({ th: l.nameTh, en: l.nameEn }, locale)]));
  const depositHeld = facts.depositCount != null && facts.depositCount > 0 && facts.depositReturnedAt === null;

  return (
    <>
      <SectionCard id="br-panel" icon={Package} title={a("brPanelTitle", locale)}>
        <Facts facts={facts} locale={locale} />
      </SectionCard>

      <SectionCard id="br-lines" icon={Table2} title={a("brLinesHeading", locale)} description={holding ? a("brLinesFreeNote", locale) : undefined}>
        <Lines facts={facts} locale={locale} showFree={status === "requested"} />
      </SectionCard>

      {holding ? (
        <SectionCard id="br-clashes" icon={CalendarClock} title={a("brClashesHeading", locale)}>
          {clashes.length === 0 ? (
            <p className="m-0 text-ink-600">{a("brClashesNone", locale)}</p>
          ) : (
            <>
              <p className="m-0 text-ink-600">{a("brClashesHint", locale)}</p>
              <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
                {clashes.map((c) => (
                  <li key={`${c.caseId}-${c.itemId}`} className="border-b border-line pb-[var(--space-2)]">
                    <a href={`/admin/cases/${c.caseId}`} className="font-medium">
                      {c.reference}
                    </a>{" "}
                    <StatusTag tone={c.status === "on_loan" ? "warning" : c.status === "approved" ? "success" : "info"} label={pick(statusLabel("borrowing", "loan", c.status), locale)} />
                    <p className="m-0 text-sm text-ink-600">
                      {a("brClashLine", locale, { qty: c.quantity, item: itemName.get(c.itemId) ?? "" })}
                      {": "}
                      <Timestamp value={c.collectAt} locale={locale} format="datetime" /> {a("brUntil", locale)} <Timestamp value={c.returnDueAt} locale={locale} format="datetime" />
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>
      ) : null}

      <SectionCard id="br-details" icon={Lock} title={a("brDetailsHeading", locale)}>
        {facts.hasDetails ? <DetailsReveal {...base} /> : <p className="m-0 text-ink-600">{a("brDetailsGone", locale)}</p>}
      </SectionCard>

      <SectionCard id="br-handling" icon={ListChecks} title={a("brHandlingHeading", locale)}>
        <div className="flex flex-col gap-[var(--space-6)]">
          {status === "requested" ? (
            <>
              <Step title={a("brApprove", locale)} hint={a("brApproveHint", locale)}>
                <ApproveForm {...base} lines={formLines} />
              </Step>
              <Step title={a("brDecline", locale)}>
                <DeclineForm {...base} />
              </Step>
              <Step title={a("brCancel", locale)}>
                <CancelForm {...base} />
              </Step>
            </>
          ) : null}
          {status === "approved" ? (
            <>
              <Step title={a("brHandoverHeading", locale)} hint={a("brHandoverHint", locale)}>
                <HandoverForm {...base} cardsAsked={facts.depositCardsAsked} />
              </Step>
              <Step title={a("brNotCollected", locale)} hint={a("brNotCollectedHint", locale)}>
                <NotCollectedButton {...base} />
              </Step>
              <Step title={a("brCancel", locale)}>
                <CancelForm {...base} />
              </Step>
            </>
          ) : null}
          {status === "on_loan" ? (
            <Step title={a("brReturnHeading", locale)} hint={a("brReturnHint", locale)}>
              <ReturnForm {...base} lines={formLines} depositHeld={depositHeld} />
            </Step>
          ) : null}
          {status === "compensation_due" ? (
            <Step title={a("brSettleHeading", locale)} hint={a("brSettleHint", locale, { baht: facts.compensationBaht ?? 0 })}>
              <SettleForm {...base} depositHeld={depositHeld} />
            </Step>
          ) : null}
          {!["requested", "approved", "on_loan", "compensation_due"].includes(status) ? <p className="m-0 text-ink-600">{a("brNoMoreSteps", locale)}</p> : null}
        </div>
      </SectionCard>
    </>
  );
}

function Step({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <Heading level={3}>{title}</Heading>
      {hint ? <p className="m-0 text-ink-600">{hint}</p> : null}
      {children}
    </div>
  );
}

function Facts({ facts, locale }: { facts: LoanFacts; locale: Locale }) {
  const when = (value: Date) => <Timestamp value={value} locale={locale} format="datetime" />;
  const deposit =
    facts.depositCount == null
      ? null
      : a("brDepositLine", locale, { count: facts.depositCount, kind: a(DEPOSIT_LABEL[facts.depositKind ?? "other"], locale) });
  return (
    <SummaryList
      rows={[
        { key: a("brRowFor", locale), value: facts.kind === "group" ? (facts.groupName ?? "") : a("brForPersonal", locale) },
        { key: a("brRowEvent", locale), value: facts.eventName },
        { key: a("brRowVenue", locale), value: facts.venue },
        { key: a("brRowPurpose", locale), value: <span className="whitespace-pre-line">{facts.purpose}</span> },
        { key: a("brRowCollect", locale), value: when(facts.collectAt) },
        {
          key: a("brRowReturn", locale),
          value: (
            <span className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
              {when(facts.returnDueAt)}
              {facts.overdue ? <StatusTag tone="error" label={a("brOverdueTag", locale)} /> : null}
            </span>
          ),
        },
        { key: a("brRowTerms", locale), value: <>{a("brTermsLine", locale, { version: facts.termsVersion })}: {when(facts.termsAcceptedAt)}</> },
        ...(facts.decidedAt ? [{ key: a("brRowDecided", locale), value: when(facts.decidedAt) }] : []),
        ...(facts.collectedAt ? [{ key: a("brRowCollected", locale), value: when(facts.collectedAt) }] : []),
        ...(deposit ? [{ key: a("brRowDeposit", locale), value: deposit }] : []),
        ...(facts.depositReturnedAt ? [{ key: a("brRowDepositBack", locale), value: when(facts.depositReturnedAt) }] : []),
        ...(facts.returnedAt ? [{ key: a("brRowReturned", locale), value: when(facts.returnedAt) }] : []),
        ...(facts.compensationBaht != null ? [{ key: a("brRowCompensation", locale), value: a("brBaht", locale, { baht: facts.compensationBaht }) }] : []),
        ...(facts.compensationNote ? [{ key: a("brRowCompensationNote", locale), value: <span className="whitespace-pre-line">{facts.compensationNote}</span> }] : []),
        ...(facts.settlement ? [{ key: a("brRowSettlement", locale), value: a(SETTLEMENT_LABEL[facts.settlement as keyof typeof SETTLEMENT_LABEL], locale) }] : []),
      ]}
    />
  );
}

function Lines({ facts, locale, showFree }: { facts: LoanFacts; locale: Locale; showFree: boolean }) {
  const returned = facts.lines.some((l) => l.returnedGood !== null);
  const columns: DataTableColumn<LoanLineFact>[] = [
    { id: "item", header: a("brColItem", locale), cell: (l) => pick({ th: l.nameTh, en: l.nameEn }, locale) },
    { id: "qty", header: a("brColQuantity", locale), align: "end", cell: (l) => `${l.quantity} ${pick({ th: l.unitTh, en: l.unitEn }, locale)}` },
    ...(showFree
      ? [
          {
            id: "free",
            header: a("brColFree", locale),
            align: "end" as const,
            cell: (l: LoanLineFact) => (
              <span className="flex flex-wrap items-center justify-end gap-x-[var(--space-2)]">
                {l.free}
                {l.free < l.quantity ? <StatusTag tone="error" label={a("brNotEnough", locale)} /> : null}
              </span>
            ),
          },
        ]
      : []),
    ...(returned
      ? [
          { id: "good", header: a("brGood", locale), align: "end" as const, cell: (l: LoanLineFact) => String(l.returnedGood ?? "") },
          { id: "damaged", header: a("brDamaged", locale), align: "end" as const, cell: (l: LoanLineFact) => String(l.damaged ?? "") },
          { id: "lost", header: a("brLost", locale), align: "end" as const, cell: (l: LoanLineFact) => String(l.lost ?? "") },
        ]
      : []),
  ];
  return <DataTable columns={columns} rows={facts.lines} getRowKey={(l) => l.lineId} caption={a("brLinesCaption", locale)} />;
}
