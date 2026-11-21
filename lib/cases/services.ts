/**
 * The service registry: one definition per service on the case engine, each
 * with a state machine per kind of case. Adding a service (complaints, stage
 * C) means adding an entry here; the engine, inbox and retention need no change.
 *
 * STATUS RULES. A status is text in `cases.status`, valid only if the machine
 * for the case's kind lists it. `transitions` is the whole rule: a move not
 * listed is refused. A `terminal` status closes the case (starting the one
 * year personal data clock); a move from a terminal status to a live one
 * reopens it and stops the clock, unless the personal data is already gone.
 *
 * PUBLIC LABELS. A status with a `publicLabel` appears on the private tracking
 * page (the status_changed event is stored as public); one without stays
 * internal. Staff always see `label`. `publicActorTo` lists the statuses the
 * person holding the tracking link may move the case to themselves (for
 * example withdrawing a report); the caller must have resolved the link first.
 *
 * SYSTEM MOVES AND GUARDS. `systemTo` lists the moves the system itself may
 * make (a daily job, or a person's public claim), which only the engine's
 * `systemTransition` performs. `guards` are conditions on a move, checked by
 * the engine for every actor, so no path can bypass them.
 */

import type { StaffRole } from "@/lib/db/schema/staff-roles";
import type { CaseService } from "@/lib/db/schema/cases";
import type { AdminKey } from "@/lib/i18n/admin";
import type { LocaleString } from "@/lib/i18n/config";
import { CASE_TEXT } from "@/lib/cases/strings";
import { withinReopenWindow } from "@/lib/complaints/reopen-window";

export type { CaseService };
export { CASE_SERVICES } from "@/lib/db/schema/cases";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export interface StatusDef {
  /** Shown to staff. */
  label: LocaleString;
  /** Shown on the tracking page, or null to keep the status internal. */
  publicLabel: LocaleString | null;
  tone: StatusTone;
  /** Reaching it closes the case. */
  terminal: boolean;
}

/** Facts about a case that a guard may read. Loaded by the engine (lib/cases/hooks.ts) only when a guard applies. */
export interface GuardFacts {
  /** A complaint's resolution date; null for any other case. */
  resolvedAt: Date | null;
}

/** A condition on one move, true when the move is allowed at `now`. */
export interface TransitionGuard {
  from: string;
  to: string;
  allows: (facts: GuardFacts, now: Date) => boolean;
}

export interface MachineDef {
  initial: string;
  statuses: Record<string, StatusDef>;
  /** From status, to the statuses staff may move it to. Every key is a status; terminal statuses may list a reopen target. */
  transitions: Record<string, readonly string[]>;
  /** Statuses the person with the tracking link may choose. Each must also be an allowed transition. */
  publicActorTo: readonly string[];
  /** From status, to the statuses the system may move it to without a person. Each must also be an allowed transition. */
  systemTo?: Record<string, readonly string[]>;
  /** Conditions on moves, enforced for every actor. */
  guards?: readonly TransitionGuard[];
}

export interface KindDef {
  label: LocaleString;
  machine: MachineDef;
}

export interface ServiceDef {
  service: CaseService;
  /** Reference prefix: LF-2026-0001. */
  prefix: "LF" | "CP" | "BR";
  label: LocaleString;
  /** Roles that may work these cases, for either organisation. */
  roles: readonly StaffRole[];
  kinds: Record<string, KindDef>;
  /**
   * How staff move a case between statuses. `generic` services use the shared
   * status form and the inbox's bulk move. `own_actions` services have their own
   * forms (resolve needs an outcome, a handover records a deposit), so the
   * generic paths refuse and show `ownActionsNotice` instead.
   */
  statusMoves: "generic" | "own_actions";
  /** The staff messages shown in place of the generic status form: `error` when one is posted anyway, `panel` on the case page. Set for `own_actions` services. */
  ownActionsNotice?: { error: AdminKey; panel: AdminKey };
}

const RETURNED = CASE_TEXT.lostReturned;
const READY = CASE_TEXT.lostReady;

/**
 * Lost report: submitted -> searching -> match_found -> ready_to_collect -> returned,
 * with closed_unfound (nothing found) and withdrawn (the person no longer needs it) as other ends.
 */
const LOST: MachineDef = {
  initial: "submitted",
  statuses: {
    submitted: { label: CASE_TEXT.lostSubmittedStaff, publicLabel: CASE_TEXT.lostSubmittedPublic, tone: "info", terminal: false },
    searching: { label: CASE_TEXT.lostSearchingStaff, publicLabel: CASE_TEXT.lostSearchingPublic, tone: "info", terminal: false },
    match_found: { label: CASE_TEXT.lostMatchFoundStaff, publicLabel: CASE_TEXT.lostMatchFoundPublic, tone: "warning", terminal: false },
    ready_to_collect: { label: READY, publicLabel: READY, tone: "success", terminal: false },
    returned: { label: RETURNED, publicLabel: RETURNED, tone: "success", terminal: true },
    closed_unfound: { label: CASE_TEXT.lostClosedUnfoundStaff, publicLabel: CASE_TEXT.lostClosedUnfoundPublic, tone: "neutral", terminal: true },
    withdrawn: { label: CASE_TEXT.lostWithdrawnStaff, publicLabel: CASE_TEXT.lostWithdrawnPublic, tone: "neutral", terminal: true },
  },
  transitions: {
    submitted: ["searching", "match_found", "closed_unfound", "withdrawn"],
    searching: ["match_found", "closed_unfound", "withdrawn"],
    match_found: ["ready_to_collect", "searching", "closed_unfound", "withdrawn"],
    ready_to_collect: ["returned", "match_found", "searching", "withdrawn"],
    returned: [],
    closed_unfound: ["searching"],
    withdrawn: [],
  },
  publicActorTo: ["withdrawn"],
};

/**
 * Found item: logged -> listed -> claim_pending -> ready_to_collect -> returned.
 * Items are kept indefinitely (backend plan, decision 1), so there is no disposal;
 * `withdrawn` is only for an entry made in error. `logged` is internal: the item
 * is not yet on the public register.
 */
const FOUND: MachineDef = {
  initial: "logged",
  statuses: {
    logged: { label: CASE_TEXT.foundLoggedStaff, publicLabel: null, tone: "info", terminal: false },
    listed: { label: CASE_TEXT.foundListedStaff, publicLabel: CASE_TEXT.foundListedPublic, tone: "info", terminal: false },
    claim_pending: { label: CASE_TEXT.foundClaimPendingStaff, publicLabel: CASE_TEXT.foundClaimPendingPublic, tone: "warning", terminal: false },
    ready_to_collect: { label: READY, publicLabel: READY, tone: "success", terminal: false },
    returned: { label: RETURNED, publicLabel: RETURNED, tone: "success", terminal: true },
    withdrawn: { label: CASE_TEXT.foundWithdrawnStaff, publicLabel: CASE_TEXT.foundWithdrawnPublic, tone: "neutral", terminal: true },
  },
  transitions: {
    logged: ["listed", "claim_pending", "returned", "withdrawn"],
    listed: ["claim_pending", "returned", "withdrawn"],
    claim_pending: ["ready_to_collect", "listed", "withdrawn"],
    ready_to_collect: ["returned", "claim_pending", "listed"],
    returned: [],
    withdrawn: [],
  },
  publicActorTo: [],
  systemTo: { logged: ["claim_pending"], listed: ["claim_pending"] },
};

/**
 * Complaint: received -> acknowledged -> in_progress -> resolved -> closed,
 * with withdrawn (the person no longer wants to pursue it), reopened, and
 * redirected (the matter belongs to a faculty or a course, outside the student
 * union's remit; staff close it and point the person to who to contact).
 * `redirected` is terminal and final: it has no way back, like `closed` and
 * `withdrawn`, because reopening it would put a matter the union cannot act on
 * back into its queue. A person who disagrees makes a new complaint.
 * `resolved` is terminal, so it starts the one year personal data clock; the
 * person may reopen it from their tracking link within the reopen window
 * (lib/complaints/constants.ts, 30 days), which stops the clock. When the
 * window passes a daily job moves it to `closed` (final, and the clock starts
 * again from then). Staff may also close it early and reopen it on the
 * person's behalf. "Escalated" is a flag on the complaint (lib/db/schema/
 * complaints.ts), not a status, so it never changes what the person sees.
 */
const COMPLAINT: MachineDef = {
  initial: "received",
  statuses: {
    received: { label: CASE_TEXT.complaintReceivedStaff, publicLabel: CASE_TEXT.complaintReceivedPublic, tone: "info", terminal: false },
    acknowledged: { label: CASE_TEXT.complaintAcknowledgedStaff, publicLabel: CASE_TEXT.complaintAcknowledgedPublic, tone: "info", terminal: false },
    in_progress: { label: CASE_TEXT.complaintInProgressStaff, publicLabel: CASE_TEXT.complaintInProgressPublic, tone: "warning", terminal: false },
    reopened: { label: CASE_TEXT.complaintReopenedStaff, publicLabel: CASE_TEXT.complaintReopenedPublic, tone: "warning", terminal: false },
    resolved: { label: CASE_TEXT.complaintResolvedStaff, publicLabel: CASE_TEXT.complaintResolvedPublic, tone: "success", terminal: true },
    redirected: { label: CASE_TEXT.complaintRedirectedStaff, publicLabel: CASE_TEXT.complaintRedirectedPublic, tone: "neutral", terminal: true },
    closed: { label: CASE_TEXT.complaintClosedStaff, publicLabel: CASE_TEXT.complaintClosedPublic, tone: "neutral", terminal: true },
    withdrawn: { label: CASE_TEXT.complaintWithdrawnStaff, publicLabel: CASE_TEXT.complaintWithdrawnPublic, tone: "neutral", terminal: true },
  },
  transitions: {
    received: ["acknowledged", "in_progress", "resolved", "redirected", "withdrawn"],
    acknowledged: ["in_progress", "resolved", "redirected", "withdrawn"],
    in_progress: ["resolved", "redirected", "withdrawn"],
    reopened: ["in_progress", "resolved", "redirected", "withdrawn"],
    resolved: ["reopened", "closed"],
    redirected: [],
    closed: [],
    withdrawn: [],
  },
  publicActorTo: ["withdrawn", "reopened"],
  systemTo: { resolved: ["closed"] },
  guards: [{ from: "resolved", to: "reopened", allows: (facts, now) => withinReopenWindow(facts.resolvedAt, now) }],
};

/**
 * Equipment loan: requested -> approved -> on_loan -> returned, the paper
 * form's three signatures (decision, handover, return) as statuses.
 * `declined` is the decision going the other way, `cancelled` the borrower
 * (from the tracking link) or staff calling it off before collection, and
 * `not_collected` nobody coming for an approved loan. A return with anything
 * damaged or missing goes to `compensation_due`, then `settled` once paid,
 * replaced or waived. Overdue is computed from `return_due_at`, not a status,
 * so the borrower's page never changes because a job ran.
 */
const LOAN: MachineDef = {
  initial: "requested",
  statuses: {
    requested: { label: CASE_TEXT.loanRequestedStaff, publicLabel: CASE_TEXT.loanRequestedPublic, tone: "info", terminal: false },
    approved: { label: CASE_TEXT.loanApprovedStaff, publicLabel: CASE_TEXT.loanApprovedPublic, tone: "success", terminal: false },
    on_loan: { label: CASE_TEXT.loanOnLoanStaff, publicLabel: CASE_TEXT.loanOnLoanPublic, tone: "warning", terminal: false },
    returned: { label: CASE_TEXT.loanReturnedStaff, publicLabel: CASE_TEXT.loanReturnedPublic, tone: "success", terminal: true },
    compensation_due: { label: CASE_TEXT.loanCompensationDueStaff, publicLabel: CASE_TEXT.loanCompensationDuePublic, tone: "error", terminal: false },
    settled: { label: CASE_TEXT.loanSettledStaff, publicLabel: CASE_TEXT.loanSettledPublic, tone: "success", terminal: true },
    declined: { label: CASE_TEXT.loanDeclinedStaff, publicLabel: CASE_TEXT.loanDeclinedPublic, tone: "neutral", terminal: true },
    cancelled: { label: CASE_TEXT.loanCancelledStaff, publicLabel: CASE_TEXT.loanCancelledPublic, tone: "neutral", terminal: true },
    not_collected: { label: CASE_TEXT.loanNotCollectedStaff, publicLabel: CASE_TEXT.loanNotCollectedPublic, tone: "neutral", terminal: true },
  },
  transitions: {
    requested: ["approved", "declined", "cancelled"],
    approved: ["on_loan", "cancelled", "not_collected"],
    on_loan: ["returned", "compensation_due"],
    compensation_due: ["settled"],
    returned: [],
    settled: [],
    declined: [],
    cancelled: [],
    not_collected: [],
  },
  publicActorTo: ["cancelled"],
};

export const SERVICES: Record<CaseService, ServiceDef> = {
  lost_found: {
    service: "lost_found",
    prefix: "LF",
    label: CASE_TEXT.serviceLostFound,
    roles: ["officer", "admin"],
    statusMoves: "generic",
    kinds: {
      lost: { label: CASE_TEXT.kindLost, machine: LOST },
      found: { label: CASE_TEXT.kindFound, machine: FOUND },
    },
  },
  complaint: {
    service: "complaint",
    prefix: "CP",
    label: CASE_TEXT.serviceComplaint,
    roles: ["officer", "admin"],
    statusMoves: "own_actions",
    ownActionsNotice: { error: "errCaseUseComplaintActions", panel: "cpcStatusUsePanel" },
    kinds: {
      complaint: { label: CASE_TEXT.kindComplaint, machine: COMPLAINT },
    },
  },
  borrowing: {
    service: "borrowing",
    prefix: "BR",
    label: CASE_TEXT.serviceBorrowing,
    roles: ["officer", "admin"],
    statusMoves: "own_actions",
    ownActionsNotice: { error: "errCaseUseLoanActions", panel: "brStatusUsePanel" },
    kinds: {
      loan: { label: CASE_TEXT.kindLoan, machine: LOAN },
    },
  },
};

export function getServiceDef(service: CaseService): ServiceDef {
  return SERVICES[service];
}

/** True when the service moves statuses through its own forms, so the generic status form and bulk move must refuse it. */
export function usesOwnActions(service: CaseService): boolean {
  return SERVICES[service].statusMoves === "own_actions";
}

/** The machine for a kind, or undefined for a kind the service does not have. */
export function getMachine(service: CaseService, kind: string): MachineDef | undefined {
  return SERVICES[service].kinds[kind]?.machine;
}

export function isValidKind(service: CaseService, kind: string): boolean {
  return kind in SERVICES[service].kinds;
}

export function initialStatus(service: CaseService, kind: string): string | undefined {
  return getMachine(service, kind)?.initial;
}

export function getStatusDef(service: CaseService, kind: string, status: string): StatusDef | undefined {
  return getMachine(service, kind)?.statuses[status];
}

export function isTerminalStatus(service: CaseService, kind: string, status: string): boolean {
  return getStatusDef(service, kind, status)?.terminal ?? false;
}

/** Statuses a case in `status` may move to. `by: "public"` narrows to what the tracking link holder may choose. */
export function allowedTransitions(service: CaseService, kind: string, status: string, by: "staff" | "public" = "staff"): string[] {
  const machine = getMachine(service, kind);
  if (!machine) return [];
  const next = machine.transitions[status] ?? [];
  return by === "public" ? next.filter((to) => machine.publicActorTo.includes(to)) : [...next];
}

export function canTransition(service: CaseService, kind: string, from: string, to: string, by: "staff" | "public" = "staff"): boolean {
  return allowedTransitions(service, kind, from, by).includes(to);
}

/** The guards that apply to a move, if any. */
export function guardsFor(service: CaseService, kind: string, from: string, to: string): TransitionGuard[] {
  return getMachine(service, kind)?.guards?.filter((g) => g.from === from && g.to === to) ?? [];
}

/** True when every guard on the move allows it. A move with no guard is allowed. */
export function guardsAllow(service: CaseService, kind: string, from: string, to: string, facts: GuardFacts, now: Date): boolean {
  return guardsFor(service, kind, from, to).every((g) => g.allows(facts, now));
}

/** True when the system may move a case from `from` to `to` (see `systemTo`). Guards are checked separately. */
export function canSystemTransition(service: CaseService, kind: string, from: string, to: string): boolean {
  return getMachine(service, kind)?.systemTo?.[from]?.includes(to) ?? false;
}

/** What the person sees for the current status; statuses with no public label read as "In progress". */
export const IN_PROGRESS_LABEL: LocaleString = CASE_TEXT.inProgress;

export function publicStatusLabel(service: CaseService, kind: string, status: string): LocaleString {
  return getStatusDef(service, kind, status)?.publicLabel ?? IN_PROGRESS_LABEL;
}

/** True when the status shows on the tracking page. Unlike `publicStatusLabel` it does not fall back to a generic label, so it is the test for "public or internal". */
export function isPublicStatus(service: CaseService, kind: string, status: string): boolean {
  return getStatusDef(service, kind, status)?.publicLabel != null;
}

/** Every status of a service across its kinds, deduplicated by key, for the inbox filter. */
export function allStatuses(service: CaseService): Array<{ key: string; label: LocaleString }> {
  const seen = new Map<string, LocaleString>();
  for (const kind of Object.values(SERVICES[service].kinds)) {
    for (const [key, def] of Object.entries(kind.machine.statuses)) if (!seen.has(key)) seen.set(key, def.label);
  }
  return [...seen].map(([key, label]) => ({ key, label }));
}

/** Staff label for a status of any kind, falling back to the raw key. */
export function statusLabel(service: CaseService, kind: string, status: string): LocaleString {
  return getStatusDef(service, kind, status)?.label ?? { th: status, en: status };
}
