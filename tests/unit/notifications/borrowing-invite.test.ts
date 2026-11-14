/** Overdue loans tell the officers once; an accepted invitation tells whoever sent it. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { notifyOverdueToOfficers, runBorrowingDaily } from "@/lib/borrowing/cron";
import { approveLoan, recordHandover } from "@/lib/borrowing/workflow";
import { acceptInvite, createInvite } from "@/lib/auth/invites";
import { notifications } from "@/lib/db/schema";
import { renderNotification } from "@/lib/notifications/render";
import { makeUser } from "../db/harness";
import { at, NOW, setupBorrowing, type Ctx } from "../borrowing/helpers";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let t: Ctx;
beforeAll(async () => {
  t = await setupBorrowing();
});

describe("borrowing return overdue", () => {
  it("tells every officer and administrator once per loan, only after the return time, and not for loans not yet out", async () => {
    const item = await t.item("football");
    const out = await t.request({ lines: [{ itemId: item.id, quantity: 1 }] });
    await approveLoan(t.db, out.caseId, t.officer, {}, { now: NOW });
    await recordHandover(t.db, out.caseId, t.officer, { checked: true, depositKind: "student_card", depositCount: 1 }, { now: at("2026-03-12", "10:00") });
    const other = await t.item("basketball-7");
    const waiting = await t.request({ lines: [{ itemId: other.id, quantity: 1 }] });
    await approveLoan(t.db, waiting.caseId, t.officer, {}, { now: NOW });

    expect(await notifyOverdueToOfficers(t.db, at("2026-03-13", "15:00"))).toBe(0);
    const late = at("2026-03-16", "09:00");
    expect(await notifyOverdueToOfficers(t.db, late)).toBe(3);
    expect(await notifyOverdueToOfficers(t.db, late)).toBe(0);
    expect(await runBorrowingDaily(t.db, late, { emailConfigured: false })).toMatchObject({ notified: 0, reminded: 0, overdue: 0 });

    const rows = await t.db.select().from(notifications).where(eq(notifications.kind, "borrowing_overdue"));
    expect(rows.map((r) => r.userId).sort()).toEqual([t.officer.userId, t.lead.userId, t.admin.userId].sort());
    expect(rows.every((r) => r.entityId === out.caseId && r.href === `/admin/cases/${out.caseId}`)).toBe(true);
    expect(rows[0]!.params).toEqual({ reference: out.reference, dueAt: at("2026-03-13", "16:00").toISOString() });
    expect(renderNotification(rows[0]!, "en").body).toBe(`${out.reference} was due back on 13 March 2026 and has not been returned.`);
  });
});

describe("invitation accepted", () => {
  it("tells the administrator who invited, and nobody when there was no inviter", async () => {
    const [tusu] = (await t.db.query.organisations.findMany()).filter((o) => o.slug === "tusu");
    const person = await makeUser(t.db, "New Colleague");
    const invite = await createInvite(t.db, { email: "new@example.org", organisationIds: [tusu!.id], roles: ["editor"], invitedBy: t.admin.userId });
    await acceptInvite(t.db, { token: invite.token, userId: person, userEmail: "new@example.org" });
    const [n] = await t.db.select().from(notifications).where(and(eq(notifications.userId, t.admin.userId), eq(notifications.kind, "invite_accepted")));
    expect(n).toMatchObject({ href: `/admin/staff/${person}`, entityType: "staff_invite", params: { name: "New Colleague" } });
    expect(renderNotification(n!, "en").body).toBe("New Colleague accepted your invitation.");

    const second = await makeUser(t.db, "Bootstrapped");
    const bootstrap = await createInvite(t.db, { email: "boot@example.org", organisationIds: [tusu!.id], roles: ["admin"], invitedBy: null });
    await acceptInvite(t.db, { token: bootstrap.token, userId: second, userEmail: "boot@example.org" });
    const self = await createInvite(t.db, { email: "self@example.org", organisationIds: [tusu!.id], roles: ["editor"], invitedBy: second });
    await acceptInvite(t.db, { token: self.token, userId: second, userEmail: "self@example.org" });
    expect(await t.db.select().from(notifications).where(eq(notifications.userId, second))).toHaveLength(0);
    expect(await t.db.select().from(notifications).where(eq(notifications.kind, "invite_accepted"))).toHaveLength(1);
  });

  it("is not created when the acceptance fails", async () => {
    const tusu = (await t.db.query.organisations.findMany()).find((o) => o.slug === "tusu")!;
    const person = await makeUser(t.db, "Wrong Address");
    const invite = await createInvite(t.db, { email: "right@example.org", organisationIds: [tusu.id], roles: ["editor"], invitedBy: t.admin.userId });
    await expect(acceptInvite(t.db, { token: invite.token, userId: person, userEmail: "wrong@example.org" })).rejects.toMatchObject({ code: "email_mismatch" });
    expect(await t.db.select().from(notifications).where(eq(notifications.kind, "invite_accepted"))).toHaveLength(1);
  });
});
