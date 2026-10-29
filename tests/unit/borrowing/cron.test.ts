/** The daily loans job, the borrower emails and the cron route. */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { borrowingJourneys, borrowingLines, borrowingRequests, caseEvents } from "@/lib/db/schema";
import { MemoryEmailSender, type EmailSender } from "@/lib/email";
import { runBorrowingDaily, nextDeskDay } from "@/lib/borrowing/cron";
import { decideBorrowerNotice, notifyBorrower } from "@/lib/borrowing/notify";
import { approveLoan, declineLoan, recordHandover } from "@/lib/borrowing/workflow";
import { env, at, NOW, setupBorrowing, type Ctx } from "./helpers";

let t: Ctx;
beforeAll(async () => {
  t = await setupBorrowing();
});

const req = async (id: string) => (await t.db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, id)))[0]!;
const events = async (id: string) => t.db.select().from(caseEvents).where(eq(caseEvents.caseId, id));
/** 08:41 in Bangkok on the day, when the job runs. */
const run8 = (day: string) => new Date(`${day}T01:41:00Z`);
const THU = at("2026-03-12", "10:00");

async function loan(slug: string, qty: number, over: Parameters<Ctx["request"]>[0] = {}, handover = true) {
  const item = await t.item(slug);
  const c = await t.request({ lines: [{ itemId: item.id, quantity: qty }], ...over });
  await approveLoan(t.db, c.caseId, t.officer, {}, { now: NOW });
  if (handover) await recordHandover(t.db, c.caseId, t.officer, { checked: true, depositKind: "student_card", depositCount: 1 }, { now: THU });
  return c;
}
const sentFor = (sender: MemoryEmailSender, reference: string) => sender.outbox.filter((m) => m.subject.includes(reference));

describe("nextDeskDay", () => {
  it("is the first desk day after today, so Friday looks ahead to Monday", () => {
    expect(nextDeskDay("2026-03-11")).toBe("2026-03-12");
    expect(nextDeskDay("2026-03-12")).toBe("2026-03-13");
    expect(nextDeskDay("2026-03-13")).toBe("2026-03-16");
    expect(nextDeskDay("2026-03-14")).toBe("2026-03-16");
    expect(nextDeskDay("2026-03-15")).toBe("2026-03-16");
  });
});

describe("return reminders", () => {
  it("emails the working day before the return, once, for loans on loan and approved", async () => {
    const out = await loan("football", 1);
    const waiting = await loan("basketball-7", 1, {}, false);
    const wed = await loan("volleyball", 1, { collectAt: at("2026-03-12"), returnDueAt: at("2026-03-18", "16:00") });
    const sender = new MemoryEmailSender();

    expect(await runBorrowingDaily(t.db, run8("2026-03-11"), { sender, emailConfigured: true, env })).toMatchObject({ reminded: 0 });

    const thursday = await runBorrowingDaily(t.db, run8("2026-03-12"), { sender, emailConfigured: true, env });
    expect(thursday).toMatchObject({ reminded: 2, overdue: 0 });
    expect(sentFor(sender, out.reference)).toHaveLength(1);
    expect(sentFor(sender, waiting.reference)).toHaveLength(1);
    expect(sentFor(sender, wed.reference)).toHaveLength(0);
    const mail = sentFor(sender, out.reference)[0]!;
    expect(mail.to).toBe("somchai@example.com");
    expect(mail.text).toContain(out.reference);
    expect(mail.text).not.toContain("Freshers football match");
    expect((await req(out.caseId)).reminderSentAt).toEqual(run8("2026-03-12"));
    expect((await events(out.caseId)).filter((e) => e.type === "reminder_sent")).toHaveLength(1);

    expect(await runBorrowingDaily(t.db, run8("2026-03-12"), { sender, emailConfigured: true, env })).toMatchObject({ reminded: 0 });
    expect(sentFor(sender, out.reference)).toHaveLength(1);

    const friday = await runBorrowingDaily(t.db, run8("2026-03-13"), { sender, emailConfigured: true, env });
    expect(friday.reminded).toBe(0);
    expect(sentFor(sender, wed.reference)).toHaveLength(0);
    const tuesday = await runBorrowingDaily(t.db, run8("2026-03-17"), { sender, emailConfigured: true, env });
    expect(tuesday.reminded).toBe(1);
    expect(sentFor(sender, wed.reference)).toHaveLength(1);
  });

  it("looks ahead over the weekend on a Friday", async () => {
    const monday = await loan("table-tennis-bat", 1, { collectAt: at("2026-03-12"), returnDueAt: at("2026-03-16", "16:00") });
    const sender = new MemoryEmailSender();
    expect((await runBorrowingDaily(t.db, run8("2026-03-13"), { sender, emailConfigured: true, env })).reminded).toBe(1);
    expect(sentFor(sender, monday.reference)).toHaveLength(1);
  });

  it("skips a borrower with no email, and keeps the loan for a later run", async () => {
    const noMail = await loan("red-flag", 1, { contact: { role: "borrower", name: "Mali Tester", phone: "0899999999", preferredContact: "phone", consentContact: true } });
    const sender = new MemoryEmailSender();
    await runBorrowingDaily(t.db, run8("2026-03-12"), { sender, emailConfigured: true, env });
    expect(sentFor(sender, noMail.reference)).toHaveLength(0);
    expect((await req(noMail.caseId)).reminderSentAt).toBeNull();
  });

  it("gives the claim back when the email fails, and sends on the next run", async () => {
    const c = await loan("relay-baton", 1);
    const failing: EmailSender = { send: async () => { throw new Error("smtp down"); } };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await runBorrowingDaily(t.db, run8("2026-03-12"), { sender: failing, emailConfigured: true, env })).toMatchObject({ reminded: 0 });
    quiet.mockRestore();
    expect((await req(c.caseId)).reminderSentAt).toBeNull();
    const sender = new MemoryEmailSender();
    expect((await runBorrowingDaily(t.db, run8("2026-03-12"), { sender, emailConfigured: true, env })).reminded).toBe(1);
    expect(sentFor(sender, c.reference)).toHaveLength(1);
  });

  it("sends nothing and claims nothing when email is not set up", async () => {
    const c = await loan("stopwatch", 1);
    const sender = new MemoryEmailSender();
    expect(await runBorrowingDaily(t.db, run8("2026-03-12"), { sender, emailConfigured: false, env })).toMatchObject({ reminded: 0, overdue: 0 });
    expect(sender.outbox).toHaveLength(0);
    expect((await req(c.caseId)).reminderSentAt).toBeNull();
  });
});

describe("overdue notices", () => {
  it("emails once, only for loans on loan past their return time", async () => {
    const late = await loan("basketball-net", 1);
    const waiting = await loan("football-net", 1, {}, false);
    const sender = new MemoryEmailSender();

    await runBorrowingDaily(t.db, run8("2026-03-13"), { sender, emailConfigured: true, env });
    expect(sentFor(sender, late.reference)).toHaveLength(0);
    const monday = await runBorrowingDaily(t.db, run8("2026-03-16"), { sender, emailConfigured: true, env });
    expect(monday.overdue).toBeGreaterThanOrEqual(1);
    const mails = sentFor(sender, late.reference);
    expect(mails).toHaveLength(1);
    expect(mails[0]!.subject).toContain("overdue");
    expect(sentFor(sender, waiting.reference)).toHaveLength(0);
    expect((await req(late.caseId)).overdueNotifiedAt).toEqual(run8("2026-03-16"));

    await runBorrowingDaily(t.db, run8("2026-03-17"), { sender, emailConfigured: true, env });
    expect(sentFor(sender, late.reference)).toHaveLength(1);
    expect((await events(late.caseId)).filter((e) => e.type === "reminder_sent" && (e.metadata as { kind?: string })?.kind === "overdue")).toHaveLength(1);
  });
});

describe("abandoned journeys", () => {
  it("deletes only expired rows, even when email is off", async () => {
    const now = run8("2026-03-16");
    await t.db.insert(borrowingJourneys).values([
      { tokenHash: "expired-1", dataEnc: "x", expiresAt: new Date(now.getTime() - 1000) },
      { tokenHash: "expired-now", dataEnc: "x", expiresAt: now },
      { tokenHash: "live-1", dataEnc: "x", expiresAt: new Date(now.getTime() + 3600_000) },
    ]);
    const out = await runBorrowingDaily(t.db, now, { emailConfigured: false });
    expect(out.journeysSwept).toBe(2);
    const left = await t.db.select().from(borrowingJourneys);
    expect(left.map((j) => j.tokenHash)).toEqual(["live-1"]);
  });
});

describe("emails to the borrower", () => {
  it("decides without decrypting anything", () => {
    expect(decideBorrowerNotice({ hasContact: false, hasEmail: false, emailConfigured: true })).toEqual({ action: "remind", reason: "no_contact" });
    expect(decideBorrowerNotice({ hasContact: true, hasEmail: false, emailConfigured: true })).toEqual({ action: "remind", reason: "no_email" });
    expect(decideBorrowerNotice({ hasContact: true, hasEmail: true, emailConfigured: false })).toEqual({ action: "remind", reason: "email_not_configured" });
    expect(decideBorrowerNotice({ hasContact: true, hasEmail: true, emailConfigured: true })).toEqual({ action: "email" });
  });

  it("sends the decision in both languages, the borrower's first, and logs the read of the address", async () => {
    const item = await t.item("football");
    const c = await t.request({ lines: [{ itemId: item.id, quantity: 1 }], locale: "en" });
    await approveLoan(t.db, c.caseId, t.officer, {}, { now: NOW });
    const sender = new MemoryEmailSender();
    const out = await notifyBorrower(t.db, c.caseId, "approved", t.officer, { sender, emailConfigured: true, env, now: NOW });
    expect(out).toEqual({ result: "sent" });
    const mail = sender.outbox[0]!;
    expect(mail.to).toBe("somchai@example.com");
    expect(mail.subject.startsWith("Your equipment request is approved")).toBe(true);
    expect(mail.text.indexOf("Your equipment request is approved")).toBeLessThan(mail.text.indexOf("อนุมัติคำขอยืมอุปกรณ์ของคุณแล้ว"));
    expect(mail.text).toContain(c.reference);
    const log = await events(c.caseId);
    expect(log.filter((e) => e.type === "contact_viewed")).toHaveLength(1);
    expect(log.some((e) => e.type === "internal_note" && e.body?.includes("approved"))).toBe(true);
  });

  it("carries the reason when declined, and reminds staff instead when it cannot send", async () => {
    const item = await t.item("football");
    const c = await t.request({ lines: [{ itemId: item.id, quantity: 1 }], locale: "th" });
    const reason = { en: "Needed for another event." };
    await declineLoan(t.db, c.caseId, { reason }, t.officer, { now: NOW });
    const sender = new MemoryEmailSender();
    expect(await notifyBorrower(t.db, c.caseId, "declined", t.officer, { sender, emailConfigured: false, env, reason })).toEqual({ result: "remind", reason: "email_not_configured" });
    expect(sender.outbox).toHaveLength(0);
    expect(await notifyBorrower(t.db, c.caseId, "declined", t.officer, { sender, emailConfigured: true, env, now: NOW, reason })).toEqual({ result: "sent" });
    expect(sender.outbox[0]!.text).toContain("Needed for another event.");
    expect(sender.outbox[0]!.subject.startsWith("ไม่อนุมัติ")).toBe(true);

    const failing: EmailSender = { send: async () => { throw new Error("down"); } };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await notifyBorrower(t.db, c.caseId, "declined", t.officer, { sender: failing, emailConfigured: true, env, reason })).toEqual({ result: "remind", reason: "send_failed" });
    quiet.mockRestore();
  });

  it("reminds staff when the borrower gave no address", async () => {
    const item = await t.item("football");
    const c = await t.request({ lines: [{ itemId: item.id, quantity: 1 }], contact: { role: "borrower", name: "No Mail", phone: "0800000000", preferredContact: "phone", consentContact: true } });
    const sender = new MemoryEmailSender();
    expect(await notifyBorrower(t.db, c.caseId, "approved", t.officer, { sender, emailConfigured: true, env })).toEqual({ result: "remind", reason: "no_email" });
    expect(sender.outbox).toHaveLength(0);
    expect((await t.db.select().from(borrowingLines).where(eq(borrowingLines.caseId, c.caseId))).length).toBe(1);
  });
});

const run = vi.fn(async () => ({ reminded: 1, overdue: 2, journeysSwept: 3 }));
describe("/api/cron/borrowing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    run.mockClear();
  });
  async function call(auth?: string) {
    vi.resetModules();
    vi.doMock("@/lib/borrowing/cron", () => ({ runBorrowingDaily: run }));
    vi.doMock("@/lib/db", () => ({ getDb: () => ({}) }));
    const { GET } = await import("@/app/api/cron/borrowing/route");
    return GET(new Request("http://localhost/api/cron/borrowing", { headers: auth ? { authorization: auth } : {} }));
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
    expect(await ok.json()).toEqual({ reminded: 1, overdue: 2, journeysSwept: 3 });
  });
});
