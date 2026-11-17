import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { notifications, staffRoles } from "@/lib/db/schema";
import { MemoryEmailSender, type EmailSender } from "@/lib/email";
import { staffNotification } from "@/lib/email/staff-notification-templates";
import { insertNotifications } from "@/lib/notifications/create";
import { deliverNotificationEmails } from "@/lib/notifications/email";
import { createTestDb, makeUser } from "../db/harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const BASE = "https://console.example.test";

describe("staffNotification template", () => {
  it("is Thai then English, https only, with no em dashes", () => {
    const kinds = ["case_assigned", "case_mention", "complaint_escalated", "borrowing_overdue", "invite_accepted", "unknown_kind"];
    for (const kind of kinds) {
      const mail = staffNotification({ kind, reference: "TPC-1234", url: `${BASE}/admin/notifications/open/abc` });
      expect(mail.text.indexOf("เปิดในคอนโซล")).toBeLessThan(mail.text.indexOf("Open in the console"));
      expect(mail.subject + mail.text + mail.html).not.toContain("—");
      expect(mail.html).toContain(`href="${BASE}/admin/notifications/open/abc"`);
    }
    expect(() => staffNotification({ kind: "case_assigned", url: "http://insecure.example.test/x" })).toThrow();
    expect(() => staffNotification({ kind: "case_assigned", url: "not a url" })).toThrow();
  });

  it("escapes the link and drops a reference that is not a plain reference", () => {
    const mail = staffNotification({ kind: "case_assigned", reference: "<script>alert(1)</script>", url: `${BASE}/a?x=1&y="2"` });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&amp;y=&quot;2&quot;");
    expect(mail.text).not.toContain("script");
    expect(staffNotification({ kind: "case_assigned", reference: "TPC-77", url: BASE }).text).toContain("TPC-77");
  });
});

describe("deliverNotificationEmails", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  beforeAll(async () => {
    db = (await createTestDb()).db;
  });

  async function staff() {
    const id = await makeUser(db);
    await db.insert(staffRoles).values({ userId: id, role: "admin", grantedBy: id });
    return id;
  }

  async function notify(userId: string, key: string) {
    const [id] = await insertNotifications(db, [{ userId, kind: "case_assigned", params: { reference: "TPC-1", actor: "Somchai" }, href: "/admin/cases/x", dedupeKey: key }]);
    return id!;
  }

  it("emails each recipient a link to their own notification, once", async () => {
    const a = await staff();
    const b = await staff();
    const ids = [await notify(a, "k1"), await notify(b, "k2")];
    const sender = new MemoryEmailSender();
    expect(await deliverNotificationEmails(db, ids, { sender, emailConfigured: true, baseUrl: BASE })).toBe(2);
    expect(sender.outbox).toHaveLength(2);
    const [rowA] = await db.select().from(notifications).where(eq(notifications.id, ids[0]!));
    expect(rowA!.userId).toBe(a);
    const mailA = sender.outbox.find((m) => m.text.includes(ids[0]!))!;
    expect(mailA.text).toContain(`${BASE}/admin/notifications/open/${ids[0]}`);
    expect(mailA.text).not.toContain("Somchai");
    expect(mailA.text).toContain("TPC-1");
  });

  it("skips suspended staff and does nothing when email is off", async () => {
    const suspended = await makeUser(db);
    const active = await staff();
    const ids = [await notify(suspended, "s1"), await notify(active, "s2")];
    const sender = new MemoryEmailSender();
    expect(await deliverNotificationEmails(db, ids, { sender, emailConfigured: true, baseUrl: BASE })).toBe(1);
    expect(sender.outbox).toHaveLength(1);
    expect(await deliverNotificationEmails(db, ids, { sender, emailConfigured: false, baseUrl: BASE })).toBe(0);
    expect(sender.outbox).toHaveLength(1);
    expect(await deliverNotificationEmails(db, [], { sender, emailConfigured: true, baseUrl: BASE })).toBe(0);
  });

  it("swallows send failures and keeps going", async () => {
    const a = await staff();
    const b = await staff();
    const ids = [await notify(a, "f1"), await notify(b, "f2")];
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let calls = 0;
    const flaky: EmailSender = {
      async send() {
        calls += 1;
        if (calls === 1) throw new Error("backend down");
        return { id: "ok" };
      },
    };
    await expect(deliverNotificationEmails(db, ids, { sender: flaky, emailConfigured: true, baseUrl: BASE })).resolves.toBe(1);
    expect(calls).toBe(2);
    const broken: EmailSender = { send: async () => Promise.reject(new Error("down")) };
    await expect(deliverNotificationEmails(db, ids, { sender: broken, emailConfigured: true, baseUrl: BASE })).resolves.toBe(0);
    error.mockRestore();
  });
});
