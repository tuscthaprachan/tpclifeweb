/** Escalation, auto-close and the cron route. */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { caseEvents, cases, complaintCases } from "@/lib/db/schema";
import { MemoryEmailSender } from "@/lib/email";
import { closeLapsedResolutions, escalateOverdue } from "@/lib/complaints/escalation";
import { escalationRecipients, sendEscalationDigests, decideComplainantNotice, notifyComplainant } from "@/lib/complaints/notify";
import { acknowledgeComplaint, reopenComplaint, resolveComplaint } from "@/lib/complaints/workflow";
import { listCases } from "@/lib/cases";
import { env, setupComplaints, NOW, type Ctx } from "./helpers";

let t: Ctx;
const DAY = 86_400_000;
beforeAll(async () => {
  t = await setupComplaints();
});
const cc = async (id: string) => (await t.db.select().from(complaintCases).where(eq(complaintCases.caseId, id)))[0]!;

describe("escalation", () => {
  it("flags only open complaints past a target, once, with an internal event", async () => {
    const fresh = await t.file({ key: "facilities" }); // ack in 2 working days, resolve in 10
    const acked = await t.file({ key: "facilities" });
    await acknowledgeComplaint(t.db, acked.caseId, {}, t.handler, { now: NOW });
    const done = await t.file({ key: "facilities" });
    await resolveComplaint(t.db, done.caseId, { outcome: { en: "ok" } }, t.handler, { now: NOW });

    expect(await escalateOverdue(t.db, new Date(NOW.getTime() + DAY))).toEqual([]);

    const day4 = new Date(NOW.getTime() + 4 * DAY);
    const first = await escalateOverdue(t.db, day4);
    expect(first.map((e) => e.caseId)).toContain(fresh.caseId);
    expect(first.find((e) => e.caseId === fresh.caseId)!.reason).toBe("acknowledge");
    expect(first.map((e) => e.caseId)).not.toContain(acked.caseId);
    expect(first.map((e) => e.caseId)).not.toContain(done.caseId);
    expect((await cc(fresh.caseId)).escalatedReason).toBe("acknowledge");
    expect(await escalateOverdue(t.db, day4)).toEqual([]);

    const day20 = new Date(NOW.getTime() + 20 * DAY);
    const second = await escalateOverdue(t.db, day20);
    const reasons = Object.fromEntries(second.map((e) => [e.caseId, e.reason]));
    expect(reasons[fresh.caseId]).toBe("resolve");
    expect(reasons[acked.caseId]).toBe("resolve");
    expect((await cc(done.caseId)).escalatedAt).toBeNull();

    const events = await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, fresh.caseId));
    const esc = events.filter((e) => e.type === "escalated");
    expect(esc).toHaveLength(2);
    expect(esc[0]!.visibility).toBe("internal");
    const inbox = await listCases(t.db, t.lead, { overdue: true, now: day20 });
    expect(inbox.rows.find((r) => r.id === fresh.caseId)).toMatchObject({ overdue: true, escalated: true });
  });

  it("a reopened complaint gets a new target and can be escalated again", async () => {
    const c = await t.file();
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "ok" } }, t.handler, { now: NOW });
    await reopenComplaint(t.db, c.caseId, {}, { kind: "public" }, { now: new Date(NOW.getTime() + DAY), env });
    const r = await cc(c.caseId);
    expect(r.escalatedAt).toBeNull();
    expect(r.resolveDueAt.getTime()).toBeGreaterThan(NOW.getTime() + 8 * DAY);
    expect((await escalateOverdue(t.db, new Date(NOW.getTime() + 3 * DAY))).map((e) => e.caseId)).not.toContain(c.caseId);
  });

  it("emails leads about ordinary complaints and only the named staff about restricted ones", async () => {
    const open = await t.file({ key: "other" });
    const secret = await t.file({ key: "harassment" });
    const items = await escalateOverdue(t.db, new Date(NOW.getTime() + 40 * DAY));
    const mine = items.filter((i) => [open.caseId, secret.caseId].includes(i.caseId));
    expect(mine.map((i) => i.restricted).sort()).toEqual([false, true]);
    const recipients = await escalationRecipients(t.db, mine);
    const email = (u: { userId: string }) => `${u.userId}@example.test`;
    const secretMails = [...recipients].filter(([, list]) => list.some((i) => i.caseId === secret.caseId)).map(([to]) => to);
    expect(secretMails).toEqual([email(t.named)]);
    const openMails = [...recipients].filter(([, list]) => list.some((i) => i.caseId === open.caseId)).map(([to]) => to);
    expect(openMails).toContain(email(t.lead));
    expect(openMails).not.toContain(email(t.named));

    const sender = new MemoryEmailSender();
    const sent = await sendEscalationDigests(t.db, mine, "https://example.test/admin/cases?overdue=1", { sender, emailConfigured: true });
    expect(sent).toBe(recipients.size);
    for (const m of sender.outbox) {
      expect(m.text).not.toMatch(/tap|room|Somchai/);
      expect(m.text).toContain("https://example.test/admin/cases?overdue=1");
    }
    expect(await sendEscalationDigests(t.db, mine, "x", { sender, emailConfigured: false })).toBe(0);
  });
});

describe("closing lapsed resolutions", () => {
  it("closes a resolved complaint after the reopen window, restarting the retention clock", async () => {
    const c = await t.file();
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "ok" } }, t.handler, { now: NOW });
    expect(await closeLapsedResolutions(t.db, new Date(NOW.getTime() + 29 * DAY))).toEqual([]);
    const when = new Date(NOW.getTime() + 31 * DAY);
    expect(await closeLapsedResolutions(t.db, when)).toContain(c.reference);
    const [r] = await t.db.select().from(cases).where(eq(cases.id, c.caseId));
    expect(r!.status).toBe("closed");
    expect(r!.closedAt).toEqual(when);
    expect(r!.piiDeleteAfter!.getTime()).toBeGreaterThan(when.getTime() + 360 * DAY);
    expect(await closeLapsedResolutions(t.db, when)).not.toContain(c.reference);
  });
});

describe("email to the complainant", () => {
  it("decides from what is held, and decrypts (logged) only when it will send", async () => {
    expect(decideComplainantNotice({ hasContact: false, hasEmail: false, consentContact: false, emailConfigured: true })).toEqual({ action: "remind", reason: "no_contact" });
    expect(decideComplainantNotice({ hasContact: true, hasEmail: true, consentContact: false, emailConfigured: true })).toEqual({ action: "remind", reason: "no_consent" });
    expect(decideComplainantNotice({ hasContact: true, hasEmail: false, consentContact: true, emailConfigured: true })).toEqual({ action: "remind", reason: "no_email" });
    expect(decideComplainantNotice({ hasContact: true, hasEmail: true, consentContact: true, emailConfigured: false })).toEqual({ action: "remind", reason: "email_not_configured" });

    const c = await t.file();
    const sender = new MemoryEmailSender();
    expect(await notifyComplainant(t.db, c.caseId, "acknowledged", t.handler, { sender, emailConfigured: false, env })).toEqual({ result: "remind", reason: "email_not_configured" });
    expect(sender.outbox).toHaveLength(0);
    expect(await notifyComplainant(t.db, c.caseId, "acknowledged", t.handler, { sender, emailConfigured: true, env, now: NOW })).toEqual({ result: "sent" });
    expect(sender.outbox[0]!.to).toBe("somchai@example.com");
    expect(sender.outbox[0]!.text).toContain(c.reference);
    expect(sender.outbox[0]!.text).not.toMatch(/tap|room 301/);
    const types = (await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId))).map((e) => e.type);
    expect(types).toContain("contact_viewed");
    const anon = await t.file({ identity: "anonymous", contact: null });
    expect(await notifyComplainant(t.db, anon.caseId, "resolved", t.handler, { sender, emailConfigured: true, env })).toEqual({ result: "remind", reason: "no_contact" });
  });
});

const run = vi.fn(async () => ({ closed: 1, escalated: 2, emailed: 3, journeysSwept: 4 }));
describe("/api/cron/complaints", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    run.mockClear();
  });
  async function call(auth?: string) {
    vi.resetModules();
    vi.doMock("@/lib/complaints/cron", () => ({ runComplaintsDaily: run }));
    vi.doMock("@/lib/db", () => ({ getDb: () => ({}) }));
    vi.doMock("@/lib/storage", () => ({ getStorage: () => ({}) }));
    const { GET } = await import("@/app/api/cron/complaints/route");
    return GET(new Request("http://localhost/api/cron/complaints", { headers: auth ? { authorization: auth } : {} }));
  }
  it("is closed without CRON_SECRET, refuses a wrong token and runs with the right one", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    const ok = await call("Bearer s3cret-value");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ closed: 1, escalated: 2, emailed: 3, journeysSwept: 4 });
  });
  it("runs the whole daily job against a database", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/complaints/cron");
    const real = await import("@/lib/complaints/cron");
    const out = await real.runComplaintsDaily(t.db, new Date(NOW.getTime() + 100 * DAY), { origin: "https://example.test" });
    expect(out).toMatchObject({ emailed: 0 });
  });
});
