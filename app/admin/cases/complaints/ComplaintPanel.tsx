import type { ReactNode } from "react";
import { FileText, ListChecks, Lock, Paperclip, Scale } from "lucide-react";
import { Heading, StatusTag, SummaryList, Tag, Timestamp } from "@/components/ui";
import { requireStaff } from "@/lib/auth/session";
import { CASE_INBOX_ROLES } from "@/lib/cases/access";
import { staffActorFor } from "@/lib/cases/staff";
import { listCategories } from "@/lib/complaints/categories";
import { readFacultiesWithOrganisations } from "@/lib/content/faculties";
import { loadRedirectTarget, type RedirectTarget } from "@/lib/complaints/redirect";
import { getComplaintFacts, type ComplaintFacts } from "@/lib/complaints/details";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import type { CasePanelProps } from "../panels";
import { Glyph, SectionCard } from "../SectionCard";
import { WORKING_STATUSES as WORKING } from "./Targets";
import { AcknowledgeForm, CloseButton, EvidenceReveal, RecategoriseForm, RedirectForm, ReopenButton, ResolveForm, StartButton, TextReveal, WellbeingButton, WithdrawButton } from "./Forms";

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
  const { locale, status, caseId } = props;
  const facts = await getComplaintFacts(db, caseId, actor);
  const categories = await listCategories(db);
  const redirectFaculties = WORKING.has(status) ? await readFacultiesWithOrganisations(db) : [];
  const redirected = status === "redirected" ? await loadRedirectTarget(db, caseId) : null;
  const base = { locale, caseId, orgId: actor.organisationId };
  const piiGone = facts.hasText === false && facts.evidenceCount === 0 && ["resolved", "closed", "withdrawn", "redirected"].includes(status);

  return (
    <>
      <SectionCard id="cp-panel" icon={Scale} title={a("cpcTitle", locale)}>
        <Facts facts={facts} locale={locale} redirected={redirected} />
      </SectionCard>

      <SectionCard id="cp-text" icon={FileText} title={a("cpcTextHeading", locale)}>
        {piiGone ? <p className="m-0 text-ink-600">{a("cpcTextGone", locale)}</p> : <TextReveal {...base} />}
      </SectionCard>

      <SectionCard id="cp-evidence" icon={Paperclip} title={a("cpcEvidenceHeading", locale)}>
        {facts.evidenceCount === 0 ? <p className="m-0 text-ink-600">{a("cpcEvidenceNone", locale)}</p> : <EvidenceReveal {...base} count={facts.evidenceCount} />}
      </SectionCard>

      <SectionCard id="cp-handling" icon={ListChecks} title={a("cpcHandlingHeading", locale)}>
        <div className="flex flex-col gap-[var(--space-6)]">
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
        {WORKING.has(status) ? (
          <Step title={a("cpcRedirectHeading", locale)} hint={a("cpcRedirectHint", locale)}>
            <RedirectForm
              {...base}
              faculties={redirectFaculties.map((f) => ({
                value: f._id,
                label: pick(f.name, locale),
                bodies: [...f.councils, ...f.programmes].map((b) => ({ value: b._id, label: b.programme ? `${pick(b.name, locale)} (${pick(b.programme, locale)})` : pick(b.name, locale) })),
              }))}
            />
          </Step>
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

/** The category, identity and the two targets with how long is left, as plain facts with no personal data. */
function Facts({ facts, locale, redirected }: { facts: ComplaintFacts; locale: Locale; redirected: RedirectTarget | null }) {
  const identity = a(`cpcIdentity_${facts.identity}` as AdminKey, locale);
  return (
    <SummaryList
      rows={[
        {
          key: a("cpcRowCategory", locale),
          value: (
            <span className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
              {pick({ th: facts.category.nameTh, en: facts.category.nameEn }, locale)}
              {facts.category.restricted ? (
                <Tag tone="governance">
                  <Glyph icon={Lock} size={14} className="me-[var(--space-1)] inline" />
                  {a("cpcRestricted", locale)}
                </Tag>
              ) : null}
            </span>
          ),
        },
        { key: a("cpcRowIdentity", locale), value: identity },
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
        ...(redirected
          ? [
              {
                key: a("cpcRowRedirected", locale),
                value: `${a(redirected.level === "course" ? "cpcRedirectLevelCourse" : "cpcRedirectLevelFaculty", locale)}${redirected.faculty ? `: ${pick(redirected.faculty.name, locale)}` : ""}`,
              },
            ]
          : []),
        ...(facts.reopenCount > 0 ? [{ key: a("cpcRowReopened", locale), value: String(facts.reopenCount) }] : []),
        ...(facts.wellbeingRoutedAt ? [{ key: a("cpcRowWellbeing", locale), value: <StatusTag tone="info" label={a("cpcWellbeingDoneShort", locale)} /> }] : []),
      ]}
    />
  );
}
