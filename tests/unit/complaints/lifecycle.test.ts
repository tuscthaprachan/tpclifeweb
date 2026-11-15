/** System moves, guards and available actions on the case machines. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLog, caseEvents, cases } from "@/lib/db/schema";
import { allowedTransitions, availableActions, canSystemTransition, guardsAllow, systemTransition, transition } from "@/lib/cases";
import { reopenWindowEnds } from "@/lib/complaints/reopen-window";
import { closeLapsedResolutions } from "@/lib/complaints/escalation";
import { resolveComplaint } from "@/lib/complaints/workflow";
import { setupComplaints, NOW, type Ctx } from "./helpers";

const DAY = 86_400_000;
let t: Ctx;
beforeAll(async () => {
  t = await setupComplaints();
}, 60_000);

describe("the machines", () => {
  it("declares the system moves and the reopen guard", () => {
    expect(canSystemTransition("complaint", "complaint", "resolved", "closed")).toBe(true);
    expect(canSystemTransition("complaint", "complaint", "received", "closed")).toBe(false);
    expect(canSystemTransition("lost_found", "found", "logged", "claim_pending")).toBe(true);
    expect(canSystemTransition("lost_found", "found", "listed", "claim_pending")).toBe(true);
    expect(canSystemTransition("lost_found", "found", "ready_to_collect", "claim_pending")).toBe(false);
    const resolvedAt = NOW;
    const last = reopenWindowEnds(resolvedAt);
    expect(guardsAllow("complaint", "complaint", "resolved", "reopened", { resolvedAt }, last)).toBe(true);
    expect(guardsAllow("complaint", "complaint", "resolved", "reopened", { resolvedAt }, new Date(last.getTime() + 1))).toBe(false);
    expect(guardsAllow("complaint", "complaint", "resolved", "reopened", { resolvedAt: null }, NOW)).toBe(false);
    expect(guardsAllow("complaint", "complaint", "received", "withdrawn", { resolvedAt: null }, NOW)).toBe(true);
  });

  it("a loan cannot move back to requested", () => {
    expect(allowedTransitions("borrowing", "loan", "approved")).not.toContain("requested");
    expect(allowedTransitions("borrowing", "loan", "declined")).toEqual([]);
  });
});

describe("availableActions", () => {
  const view = (service: "complaint" | "lost_found" | "borrowing", kind: string, status: string) => ({ service, kind, status });
  it("complaint: withdraw while working, reopen inside the window, survey when open", () => {
    expect(availableActions(view("complaint", "complaint", "received"), NOW)).toEqual(["withdraw"]);
    const resolvedAt = NOW;
    expect(availableActions(view("complaint", "complaint", "resolved"), new Date(NOW.getTime() + DAY), { resolvedAt, surveyOpen: true })).toEqual(["survey", "reopen"]);
    expect(availableActions(view("complaint", "complaint", "resolved"), new Date(NOW.getTime() + 31 * DAY), { resolvedAt })).toEqual([]);
    expect(availableActions(view("complaint", "complaint", "closed"), NOW, { surveyOpen: true })).toEqual(["survey"]);
  });
  it("lost report and loan: withdraw until the machine says no", () => {
    expect(availableActions(view("lost_found", "lost", "searching"), NOW)).toEqual(["withdraw"]);
    expect(availableActions(view("lost_found", "lost", "returned"), NOW)).toEqual([]);
    expect(availableActions(view("lost_found", "found", "listed"), NOW)).toEqual([]);
    expect(availableActions(view("borrowing", "loan", "approved"), NOW)).toEqual(["withdraw"]);
    expect(availableActions(view("borrowing", "loan", "on_loan"), NOW)).toEqual([]);
  });
});

describe("the engine", () => {
  it("refuses a reopen outside the window for the public and for staff, inside it for both", async () => {
    const c = await t.file();
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "Done" } }, t.handler, { now: NOW });
    const late = new Date(NOW.getTime() + 31 * DAY);
    await expect(transition(t.db, c.caseId, "reopened", { kind: "public" }, { now: late })).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(transition(t.db, c.caseId, "reopened", t.handler, { now: late })).rejects.toMatchObject({ code: "invalid_transition" });
    expect((await t.db.select().from(cases).where(eq(cases.id, c.caseId)))[0]!.status).toBe("resolved");
    const inside = new Date(NOW.getTime() + DAY);
    await transition(t.db, c.caseId, "reopened", { kind: "public" }, { now: inside });
    expect((await t.db.select().from(cases).where(eq(cases.id, c.caseId)))[0]!.status).toBe("reopened");
  });

  it("systemTransition makes only declared moves and returns null otherwise", async () => {
    const c = await t.file();
    expect(await systemTransition(t.db, c.caseId, "closed", { kind: "system" }, { now: NOW })).toBeNull();
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "Done" } }, t.handler, { now: NOW });
    const when = new Date(NOW.getTime() + 40 * DAY);
    const moved = await systemTransition(t.db, c.caseId, "closed", { kind: "system" }, { now: when, auditAction: "x.test", metadata: { auto: true } });
    expect(moved).toMatchObject({ status: "closed", closedAt: when });
    expect(await systemTransition(t.db, c.caseId, "closed", { kind: "system" }, { now: when })).toBeNull();
    const events = await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId));
    expect(events.find((e) => e.toStatus === "closed")).toMatchObject({ fromStatus: "resolved", visibility: "public", metadata: { auto: true } });
    expect((await t.db.select().from(auditLog).where(eq(auditLog.action, "x.test"))).length).toBe(1);
  });

  it("the daily close keeps its audit action name", async () => {
    const c = await t.file();
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "Done" } }, t.handler, { now: NOW });
    await closeLapsedResolutions(t.db, new Date(NOW.getTime() + 31 * DAY));
    const rows = await t.db.select().from(auditLog).where(eq(auditLog.entityId, c.caseId));
    const close = rows.find((r) => r.action === "complaint.auto_close");
    expect(close?.after).toMatchObject({ status: "closed", reopenWindowDays: 30 });
  });
});
