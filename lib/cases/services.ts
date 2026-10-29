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
 */

import type { StaffRole } from "@/lib/db/schema/staff-roles";
import type { CaseService } from "@/lib/db/schema/cases";
import type { LocaleString } from "@/lib/i18n/config";

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

export interface MachineDef {
  initial: string;
  statuses: Record<string, StatusDef>;
  /** From status, to the statuses staff may move it to. Every key is a status; terminal statuses may list a reopen target. */
  transitions: Record<string, readonly string[]>;
  /** Statuses the person with the tracking link may choose. Each must also be an allowed transition. */
  publicActorTo: readonly string[];
}

export interface KindDef {
  label: LocaleString;
  machine: MachineDef;
}

export interface ServiceDef {
  service: CaseService;
  /** Reference prefix: LF-2026-0001. */
  prefix: "LF" | "CP";
  label: LocaleString;
  /** Roles that may work these cases, in either organisation. `unit_lead` and `admin` see every service. */
  roles: readonly StaffRole[];
  kinds: Record<string, KindDef>;
}

const s = (th: string, en: string): LocaleString => ({ th, en });

const RETURNED = s("คืนเจ้าของแล้ว", "Returned to the owner");
const READY = s("พร้อมให้มารับ", "Ready to collect");

/**
 * Lost report: submitted -> searching -> match_found -> ready_to_collect -> returned,
 * with closed_unfound (nothing found) and withdrawn (the person no longer needs it) as other ends.
 */
const LOST: MachineDef = {
  initial: "submitted",
  statuses: {
    submitted: { label: s("รับเรื่องแล้ว", "Submitted"), publicLabel: s("รับเรื่องแล้ว", "Received"), tone: "info", terminal: false },
    searching: { label: s("กำลังค้นหา", "Searching"), publicLabel: s("เรากำลังค้นหาให้", "We are looking for it"), tone: "info", terminal: false },
    match_found: { label: s("พบของที่อาจตรงกัน", "Possible match found"), publicLabel: s("พบของที่อาจเป็นของคุณ", "We may have found it"), tone: "warning", terminal: false },
    ready_to_collect: { label: READY, publicLabel: READY, tone: "success", terminal: false },
    returned: { label: RETURNED, publicLabel: RETURNED, tone: "success", terminal: true },
    closed_unfound: { label: s("ปิดเรื่อง ไม่พบของ", "Closed, not found"), publicLabel: s("ปิดเรื่อง ยังไม่พบของ", "Closed, not found"), tone: "neutral", terminal: true },
    withdrawn: { label: s("ผู้แจ้งยกเลิก", "Withdrawn"), publicLabel: s("ยกเลิกเรื่องแล้ว", "Withdrawn"), tone: "neutral", terminal: true },
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
    logged: { label: s("บันทึกของแล้ว", "Logged"), publicLabel: null, tone: "info", terminal: false },
    listed: { label: s("ประกาศในรายการของที่พบ", "Listed"), publicLabel: s("อยู่ในรายการของที่พบ", "Listed as found"), tone: "info", terminal: false },
    claim_pending: { label: s("มีผู้อ้างสิทธิ์ รอตรวจสอบ", "Claim pending"), publicLabel: s("กำลังตรวจสอบการอ้างสิทธิ์", "Checking a claim"), tone: "warning", terminal: false },
    ready_to_collect: { label: READY, publicLabel: READY, tone: "success", terminal: false },
    returned: { label: RETURNED, publicLabel: RETURNED, tone: "success", terminal: true },
    withdrawn: { label: s("ถอนออกจากทะเบียน", "Removed from the register"), publicLabel: s("ถอนออกจากรายการแล้ว", "Removed from the register"), tone: "neutral", terminal: true },
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
    received: { label: s("รับเรื่องแล้ว", "Received"), publicLabel: s("รับเรื่องแล้ว", "Received"), tone: "info", terminal: false },
    acknowledged: { label: s("รับทราบแล้ว", "Acknowledged"), publicLabel: s("เจ้าหน้าที่รับทราบแล้ว", "Acknowledged by staff"), tone: "info", terminal: false },
    in_progress: { label: s("กำลังดำเนินการ", "In progress"), publicLabel: s("กำลังดำเนินการ", "Being looked into"), tone: "warning", terminal: false },
    reopened: { label: s("เปิดเรื่องอีกครั้ง", "Reopened"), publicLabel: s("เปิดเรื่องอีกครั้ง", "Reopened"), tone: "warning", terminal: false },
    resolved: { label: s("แก้ไขแล้ว", "Resolved"), publicLabel: s("แก้ไขแล้ว", "Resolved"), tone: "success", terminal: true },
    redirected: { label: s("ส่งต่อให้คณะหรือผู้สอน", "Redirected"), publicLabel: s("แนะนำหน่วยงานที่รับผิดชอบแล้ว", "Redirected to the right people"), tone: "neutral", terminal: true },
    closed: { label: s("ปิดเรื่อง", "Closed"), publicLabel: s("ปิดเรื่องแล้ว", "Closed"), tone: "neutral", terminal: true },
    withdrawn: { label: s("ผู้แจ้งยกเลิก", "Withdrawn"), publicLabel: s("ยกเลิกเรื่องแล้ว", "Withdrawn"), tone: "neutral", terminal: true },
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
};

export const SERVICES: Record<CaseService, ServiceDef> = {
  lost_found: {
    service: "lost_found",
    prefix: "LF",
    label: s("ของหายและของที่พบ", "Lost and found"),
    roles: ["lf_officer", "unit_lead", "admin"],
    kinds: {
      lost: { label: s("แจ้งของหาย", "Lost report"), machine: LOST },
      found: { label: s("ของที่พบ", "Found item"), machine: FOUND },
    },
  },
  complaint: {
    service: "complaint",
    prefix: "CP",
    label: s("ข้อร้องเรียน", "Complaints"),
    roles: ["complaints_handler", "unit_lead", "admin"],
    kinds: {
      complaint: { label: s("ข้อร้องเรียน", "Complaint"), machine: COMPLAINT },
    },
  },
};

export function getServiceDef(service: CaseService): ServiceDef {
  return SERVICES[service];
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

/** What the person sees for the current status; statuses with no public label read as "In progress". */
export const IN_PROGRESS_LABEL: LocaleString = s("กำลังดำเนินการ", "In progress");

export function publicStatusLabel(service: CaseService, kind: string, status: string): LocaleString {
  return getStatusDef(service, kind, status)?.publicLabel ?? IN_PROGRESS_LABEL;
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
