/** The complaint state machine and what each step records, on PGlite with the real migrations. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { allowedTransitions, canTransition, getMachine, publicCaseView, SERVICES, transition, type StaffActor } from "@/lib/cases";
import { caseEvents, cases, complaintCases } from "@/lib/db/schema";
import { acknowledgeComplaint, canReopenNow, closeComplaint, recategoriseComplaint, reopenComplaint, resolveComplaint, routeToWellbeing, startComplaint } from "@/lib/complaints/workflow";
import { ComplaintError } from "@/lib/complaints/errors";
import { REOPEN_WINDOW_DAYS } from "@/lib/complaints/constants";
import { openTracked, parseTrackingInput, reopenTracked, withdrawTracked } from "@/lib/complaints/public/track";
import { env, setupComplaints, NOW, type Ctx } from "./helpers";

let t: Ctx;
let h: StaffActor;
const DAY = 86_400_000;
beforeAll(async () => {
  t = await setupComplaints();
  h = t.handler;
});
const row = async (id: string) => (await t.db.select().from(cases).where(eq(cases.id, id)))[0]!;
const cc = async (id: string) => (await t.db.select().from(complaintCases).where(eq(complaintCases.caseId, id)))[0]!;

describe("machine", () => {
  it("has the planned statuses and moves", () => {
    const m = getMachine("complaint", "complaint")!;
    expect(Object.keys(m.statuses).sort()).toEqual(["acknowledged", "closed", "in_progress", "received", "reopened", "resolved", "withdrawn"]);
    expect(m.initial).toBe("received");
    expect(allowedTransitions("complaint", "complaint", "received")).toEqual(["acknowledged", "in_progress", "resolved", "withdrawn"]);
    expect(canTransition("complaint", "complaint", "resolved", "closed")).toBe(true);
    expect(allowedTransitions("complaint", "complaint", "closed")).toEqual([]);
    expect(allowedTransitions("complaint", "complaint", "withdrawn")).toEqual([]);
    expect(allowedTransitions("complaint", "complaint", "resolved", "public")).toEqual(["reopened"]);
    expect(allowedTransitions("complaint", "complaint", "in_progress", "public")).toEqual(["withdrawn"]);
    expect(allowedTransitions("complaint", "complaint", "closed", "public")).toEqual([]);
  });
  it("labels every status in both languages for staff and the public", () => {
    for (const def of Object.values(SERVICES.complaint.kinds.complaint!.machine.statuses)) {
      expect(def.label.th && def.label.en && def.publicLabel?.th && def.publicLabel?.en).toBeTruthy();
    }
  });
});

describe("workflow", () => {
  it("acknowledge -> start -> resolve -> close, recording dates and the public timeline", async () => {
    const c = await t.file();
    expect((await row(c.caseId)).status).toBe("received");
    expect(c.reference).toMatch(/^CP-2026-\d{4}$/);

    await acknowledgeComplaint(t.db, c.caseId, { message: { en: "We are on it" } }, h, { now: new Date(NOW.getTime() + 1000) });
    expect((await row(c.caseId)).status).toBe("acknowledged");
    expect((await cc(c.caseId)).acknowledgedAt).not.toBeNull();
    await expect(acknowledgeComplaint(t.db, c.caseId, {}, h)).rejects.toMatchObject({ code: "stale" });

    await startComplaint(t.db, c.caseId, h, { now: NOW });
    expect((await row(c.caseId)).status).toBe("in_progress");

    await expect(resolveComplaint(t.db, c.caseId, { outcome: { th: " ", en: "" } }, h)).rejects.toMatchObject({ code: "invalid" });
    const resolvedAt = new Date(NOW.getTime() + 2 * DAY);
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "The tap was repaired" } }, h, { now: resolvedAt });
    const r = await row(c.caseId);
    expect(r.status).toBe("resolved");
    expect(r.closedAt).toEqual(resolvedAt);
    expect(r.piiDeleteAfter!.getUTCFullYear()).toBe(resolvedAt.getUTCFullYear() + 1);
    expect((await cc(c.caseId)).resolvedAt).toEqual(resolvedAt);

    const view = await publicCaseView(t.db, c.caseId);
    expect(view.statusLabel.en).toBe("Resolved");
    expect(view.timeline.map((e) => e.title.en)).toContain("Acknowledged by staff");
    const outcome = await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId));
    const res = outcome.find((e) => e.type === "resolution")!;
    expect(res.visibility).toBe("public");
    expect(res.bodyEn).toBe("The tap was repaired");
    expect(res.bodyTh).toBeNull();

    await closeComplaint(t.db, c.caseId, h, { now: new Date(resolvedAt.getTime() + DAY) });
    expect((await row(c.caseId)).status).toBe("closed");
    await expect(reopenComplaint(t.db, c.caseId, {}, h)).rejects.toMatchObject({ code: "stale" });
  });

  it("refuses a status change the machine does not list", async () => {
    const c = await t.file();
    await expect(transition(t.db, c.caseId, "closed", h)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(closeComplaint(t.db, c.caseId, h)).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("reopen: the person inside the window, refused outside it; the clock and the targets restart", async () => {
    const c = await t.file({ key: "facilities" });
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "Done" } }, h, { now: NOW });
    const resolvedAt = (await cc(c.caseId)).resolvedAt!;
    expect(canReopenNow(resolvedAt, "resolved", new Date(resolvedAt.getTime() + REOPEN_WINDOW_DAYS * DAY))).toBe(true);
    expect(canReopenNow(resolvedAt, "resolved", new Date(resolvedAt.getTime() + REOPEN_WINDOW_DAYS * DAY + 1))).toBe(false);
    expect(canReopenNow(resolvedAt, "closed", NOW)).toBe(false);

    const late = new Date(resolvedAt.getTime() + (REOPEN_WINDOW_DAYS + 1) * DAY);
    await expect(reopenComplaint(t.db, c.caseId, { reason: "still leaking" }, { kind: "public" }, { now: late, env })).rejects.toBeInstanceOf(ComplaintError);
    expect((await row(c.caseId)).status).toBe("resolved");

    const inside = new Date(resolvedAt.getTime() + 10 * DAY);
    await reopenComplaint(t.db, c.caseId, { reason: "still leaking" }, { kind: "public" }, { now: inside, env: env });
    const r = await row(c.caseId);
    expect(r.status).toBe("reopened");
    expect(r.closedAt).toBeNull();
    expect(r.piiDeleteAfter).toBeNull();
    const after = await cc(c.caseId);
    expect(after.reopenCount).toBe(1);
    expect(after.resolvedAt).toBeNull();
    expect(after.resolveDueAt.getTime()).toBeGreaterThan(inside.getTime());
    expect(after.reopenReasonEnc).toMatch(/^pii1\./);
    expect(after.reopenReasonEnc).not.toContain("leaking");
  });

  it("the tracking link holder can withdraw and reopen; nobody else can", async () => {
    const c = await t.file();
    const bad = await withdrawTracked(t.db, c.reference, "a".repeat(43), { ip: "1.1.1.1" }, NOW);
    expect(bad).toBe("none");
    const open = await openTracked(t.db, c.reference, c.token, "1.1.1.1", NOW);
    expect(open.state).toBe("ok");
    if (open.state === "ok") {
      expect(open.complaint.canWithdraw).toBe(true);
      expect(open.complaint.canReopen).toBe(false);
    }
    expect(await reopenTracked(t.db, c.reference, c.token, "", { ip: "1.1.1.1" }, { now: NOW })).toBe("not_allowed");
    expect(await withdrawTracked(t.db, c.reference, c.token, { ip: "1.1.1.1" }, NOW)).toBe("done");
    expect((await row(c.caseId)).status).toBe("withdrawn");
    expect(await withdrawTracked(t.db, c.reference, c.token, { ip: "1.1.1.1" }, NOW)).toBe("not_allowed");
  });

  it("a lost and found link or a wrong reference prefix does not open a complaint", async () => {
    expect(parseTrackingInput("LF-2026-0001", "a".repeat(43))).toBeNull();
    expect(parseTrackingInput("cp-2026-0001", `https://x.test/en/complaints/track/link?ref=CP-2026-0001&t=${"b".repeat(43)}`)).toEqual({ reference: "CP-2026-0001", token: "b".repeat(43) });
  });

  it("recategorise recalculates targets from receipt and records the change", async () => {
    const c = await t.file({ key: "facilities" });
    const before = await cc(c.caseId);
    const target = await t.category("other");
    const out = await recategoriseComplaint(t.db, c.caseId, target.id, h, { now: NOW });
    expect(out).toEqual({ stillVisible: true, unassigned: false });
    const after = await cc(c.caseId);
    expect(after.categoryId).toBe(target.id);
    expect(after.resolveDueAt.getTime()).toBeGreaterThan(before.resolveDueAt.getTime());
    expect((await row(c.caseId)).subtype).toBe("other");
    const ev = (await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId))).find((e) => e.type === "recategorised")!;
    expect(ev.metadata).toMatchObject({ from: "facilities", to: "other" });
  });

  it("records the wellbeing referral once", async () => {
    const c = await t.file({ key: "harassment" });
    expect(await routeToWellbeing(t.db, c.caseId, t.named)).toBe(true);
    expect(await routeToWellbeing(t.db, c.caseId, t.named)).toBe(false);
    expect((await cc(c.caseId)).wellbeingRoutedAt).not.toBeNull();
  });
});
