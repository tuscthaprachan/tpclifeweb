import type { ReactNode } from "react";
import { Heading, StatusTag, SummaryList, Tag, Timestamp } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { CASE_INBOX_ROLES } from "@/lib/cases/access";
import { staffActorFor } from "@/lib/cases/staff";
import { listCategories } from "@/lib/complaints/categories";
import { getComplaintFacts, type ComplaintFacts } from "@/lib/complaints/details";
import { workingDaysUntil } from "@/lib/complaints/working-days";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CasePanelProps } from "../panels";
import { AcknowledgeForm, CloseButton, EvidenceReveal, RecategoriseForm, ReopenButton, ResolveForm, StartButton, TextReveal, WellbeingButton, WithdrawButton } from "./Forms";

const WORKING = new Set(["received", "acknowledged", "in_progress", "reopened"]);

/**
 * The complaints part of the case page (registered in ../panels.ts): category
 * with its targets and time left, the logged "Show" for what the person wrote
 * and for their evidence, and the handling actions the status allows. This
 * component never decrypts anything itself, and the case page has already
 * refused staff who may not see the case; `getComplaintFacts` checks again.
 */
export async function ComplaintPanel(props: CasePanelProps) {
  const staff = await requireStaff(CASE_INBOX_ROLES);
  const actor = await staffActorFor(staff, "complaint", props.organisationId);
  const db = getDb();
  const facts = await getComplaintFacts(db, props.caseId, actor);
  const categories = await listCategories(db);
  const { locale, status, caseId } = props;
  const base = { locale, caseId, orgId: actor.organisationId };
  const piiGone = facts.hasText === false && facts.evidenceCount === 0 && ["resolved", "closed", "withdrawn"].includes(status);

  return (
    <section aria-labelledby="cp-panel" className="flex flex-col gap-[var(--space-6)]">
      <Heading level={2} id="cp-panel">
        {a("cpcTitle", locale)}
      </Heading>

      <Facts facts={facts} status={status} locale={locale} now={new Date()} />

      <div className="flex flex-col gap-[var(--space-3)]">
        <Heading level={3}>{a("cpcTextHeading", locale)}</Heading>
        {piiGone ? <p className="m-0 text-ink-600">{a("cpcTextGone", locale)}</p> : <TextReveal {...base} />}
      </div>

      <div className="flex flex-col gap-[var(--space-3)]">
        <Heading level={3}>{a("cpcEvidenceHeading", locale)}</Heading>
        {facts.evidenceCount === 0 ? <p className="m-0 text-ink-600">{a("cpcEvidenceNone", locale)}</p> : <EvidenceReveal {...base} count={facts.evidenceCount} />}
      </div>

      <div className="flex flex-col gap-[var(--space-6)]">
        <Heading level={3}>{a("cpcHandlingHeading", locale)}</Heading>
        {status === "received" ? (
          <Step title={a("cpcAcknowledge", locale)}>
            <AcknowledgeForm {...base} />
          </Step>
        ) : null}
        {WORKING.has(status) && status !== "in_progress" ? (
          <Step title={a("cpcStart", locale)}>
            <StartButton {...base} />
          </Step>
        ) : null}
        {WORKING.has(status) || status === "in_progress" ? (
          <Step title={a("cpcResolve", locale)}>
            <ResolveForm {...base} />
          </Step>
        ) : null}
        {status === "resolved" ? (
          <>
            <Step title={a("cpcClose", locale)} hint={a("cpcCloseHint", locale)}>
              <CloseButton {...base} />
            </Step>
            <Step title={a("cpcReopen", locale)} hint={a("cpcReopenHint", locale)}>
              <ReopenButton {...base} />
            </Step>
          </>
        ) : null}
        <Step title={a("cpcCategoryHeading", locale)} hint={a("cpcCategoryHint", locale)}>
          <RecategoriseForm
            {...base}
            current={{ id: facts.category.id, restricted: facts.category.restricted }}
            categories={categories.filter((c) => c.active || c.id === facts.category.id).map((c) => ({ value: c.id, label: `${pick({ th: c.nameTh, en: c.nameEn }, locale)}${c.restricted ? ` (${a("cpcRestrictedShort", locale)})` : ""}`, restricted: c.restricted }))}
          />
        </Step>
        <Step title={a("cpcWellbeingHeading", locale)} hint={a("cpcWellbeingHint", locale)}>
          {facts.wellbeingRoutedAt ? (
            <p className="m-0">
              {a("cpcWellbeingDone", locale)} <Timestamp value={facts.wellbeingRoutedAt} locale={locale} format="date" />
            </p>
          ) : (
            <WellbeingButton {...base} />
          )}
        </Step>
        {WORKING.has(status) ? (
          <Step title={a("cpcWithdrawHeading", locale)} hint={a("cpcWithdrawHint", locale)}>
            <WithdrawButton {...base} from={status} />
          </Step>
        ) : null}
      </div>
    </section>
  );
}

function Step({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <Heading level={4}>{title}</Heading>
      {hint ? <p className="m-0 text-ink-600">{hint}</p> : null}
      {children}
    </div>
  );
}

/** The category, identity and the two targets with how long is left, as plain facts with no personal data. */
function Facts({ facts, status, locale, now }: { facts: ComplaintFacts; status: string; locale: Locale; now: Date }) {
  const open = WORKING.has(status);
  const target = (due: Date, done: Date | null): ReactNode => {
    if (done) return a("cpcTargetMet", locale);
    if (!open) return a("cpcTargetNa", locale);
    const left = workingDaysUntil(now, due);
    return (
      <span className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        <Timestamp value={due} locale={locale} format="date" />
        {due.getTime() < now.getTime() ? (
          <StatusTag tone="error" label={a("cpcOverdue", locale)} />
        ) : (
          <span className="text-ink-600">{left <= 0 ? a("cpcDueToday", locale) : a(left === 1 ? "cpcWorkingDaysLeftOne" : "cpcWorkingDaysLeft", locale, { count: left })}</span>
        )}
      </span>
    );
  };
  const identity = a(`cpcIdentity_${facts.identity}` as AdminKey, locale);
  return (
    <SummaryList
      rows={[
        {
          key: a("cpcRowCategory", locale),
          value: (
            <span className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
              {pick({ th: facts.category.nameTh, en: facts.category.nameEn }, locale)}
              {facts.category.restricted ? <Tag tone="governance">{a("cpcRestricted", locale)}</Tag> : null}
            </span>
          ),
        },
        { key: a("cpcRowIdentity", locale), value: identity },
        { key: a("cpcRowAcknowledgeDue", locale), value: target(facts.acknowledgeDueAt, facts.acknowledgedAt) },
        { key: a("cpcRowResolveDue", locale), value: target(facts.resolveDueAt, facts.resolvedAt) },
        { key: a("cpcRowTargets", locale), value: a("cpcTargetsText", locale, { ack: facts.category.acknowledgeDays, resolve: facts.category.resolveDays }) },
        ...(facts.escalatedAt
          ? [
              {
                key: a("cpcRowEscalated", locale),
                value: (
                  <span className="flex flex-wrap items-center gap-x-[var(--space-3)]">
                    <StatusTag tone="error" label={a(facts.escalatedReason === "acknowledge" ? "cpcEscalatedAck" : "cpcEscalatedResolve", locale)} />
                    <Timestamp value={facts.escalatedAt} locale={locale} format="date" />
                  </span>
                ),
              },
            ]
          : []),
        ...(facts.reopenCount > 0 ? [{ key: a("cpcRowReopened", locale), value: String(facts.reopenCount) }] : []),
        ...(facts.wellbeingRoutedAt ? [{ key: a("cpcRowWellbeing", locale), value: <StatusTag tone="info" label={a("cpcWellbeingDoneShort", locale)} /> }] : []),
      ]}
    />
  );
}
