/** Notifications are created by the events that cause them, in the same transaction, and only for people who may see the case. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { addNote, assign, createCase, staffTimeline } from "@/lib/cases";
import { listMentionable, mentionedIds, parseMentions, plainMentions, splitMentions } from "@/lib/cases/mentions";
import { escalateOverdue } from "@/lib/complaints/escalation";
import { caseEvents, notifications, user } from "@/lib/db/schema";
import { countUnread, getNotification, listNotifications, markAllRead, markRead, parseNotificationQuery, safeConsoleHref } from "@/lib/notifications/read";
import { renderNotification } from "@/lib/notifications/render";
import { setupComplaints, NOW, type Ctx } from "../complaints/helpers";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let t: Ctx;
beforeAll(async () => {
  t = await setupComplaints();
});

const forUser = async (userId: string, kind?: string) =>
  (await t.db.select().from(notifications).where(kind ? and(eq(notifications.userId, userId), eq(notifications.kind, kind)) : eq(notifications.userId, userId))).sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
const lost = async () => createCase(t.db, { service: "lost_found", kind: "lost", summary: "Umbrella" }, { kind: "public" }, { now: NOW });

describe("case assigned", () => {
  it("tells the assignee, with the reference and who assigned it, and links to the case", async () => {
    const c = await lost();
    await assign(t.db, c.id, t.lead.userId, t.handler, { now: NOW });
    const [n] = await forUser(t.lead.userId, "case_assigned");
    expect(n).toMatchObject({ kind: "case_assigned", href: `/admin/cases/${c.id}`, entityType: "case", entityId: c.id, readAt: null });
    expect(n!.params).toEqual({ actor: "Handler One", reference: c.reference });
    expect(renderNotification(n!, "en")).toEqual({ title: "Case assigned to you", body: `Handler One assigned ${c.reference} to you.` });
    expect(renderNotification(n!, "th").body).toContain(c.reference);
  });

  it("says nothing when you assign to yourself, clear the assignee or change nothing", async () => {
    const before = (await t.db.select().from(notifications)).length;
    const c = await lost();
    await assign(t.db, c.id, t.handler.userId, t.handler, { now: NOW });
    await assign(t.db, c.id, null, t.handler, { now: NOW });
    await assign(t.db, c.id, t.lead.userId, t.handler, { now: NOW });
    await assign(t.db, c.id, t.lead.userId, t.handler, { now: NOW });
    expect((await t.db.select().from(notifications)).length - before).toBe(1);
  });

  it("is not created when the assignment is refused", async () => {
    const before = (await t.db.select().from(notifications)).length;
    const hidden = await t.file({ key: "harassment" });
    await expect(assign(t.db, hidden.caseId, t.lead.userId, t.handler, { now: NOW })).rejects.toMatchObject({ code: "not_found" });
    await expect(assign(t.db, hidden.caseId, t.handler.userId, t.named, { now: NOW })).rejects.toMatchObject({ code: "invalid" });
    expect((await t.db.select().from(notifications)).length).toBe(before);
  });
});

describe("mentions", () => {
  const people = [
    { id: "u1", name: "Lead" },
    { id: "u2", name: "Handler Two" },
    { id: "u3", name: "Pim" },
    { id: "u4", name: "Pim" },
  ];

  it("turns @Name into a stored token, longest name first, case-insensitively", () => {
    const out = parseMentions("Ask @lead and @Handler Two. (@Lead again)", people);
    expect(out.text).toBe("Ask @[u1] and @[u2]. (@[u1] again)");
    expect(out.ids).toEqual(["u1", "u2"]);
  });

  it("leaves text that only looks like a mention alone", () => {
    expect(parseMentions("mail me at x@Lead.org or @Leader", people)).toEqual({ text: "mail me at x@Lead.org or @Leader", ids: [] });
    expect(parseMentions("@Nobody", people).ids).toEqual([]);
  });

  it("does not guess between two people with the same name, but follows the autocomplete's choice", () => {
    expect(parseMentions("@Pim please look", people)).toEqual({ text: "@Pim please look", ids: [] });
    expect(parseMentions("@Pim please look", people, ["u4"])).toEqual({ text: "@[u4] please look", ids: ["u4"] });
    expect(parseMentions("@Pim", people, ["u3", "u4"]).ids).toEqual([]);
  });

  it("reads tokens back as ids, parts and names", () => {
    const text = "See @[u1], then @[u2]!";
    expect(mentionedIds(text)).toEqual(["u1", "u2"]);
    expect(splitMentions(text)).toEqual([{ text: "See " }, { mention: "u1" }, { text: ", then " }, { mention: "u2" }, { text: "!" }]);
    expect(plainMentions(text, new Map([["u1", "Lead"]]))).toBe("See @Lead, then @?!");
  });

  it("notifies each mentioned colleague once, never the author, and stores ids on the note", async () => {
    const c = await lost();
    const eventId = await addNote(t.db, c.id, "Please check @Lead and @Handler Two. Also @Handler One.", t.handler, { now: NOW });
    const [event] = await t.db.select().from(caseEvents).where(eq(caseEvents.id, eventId));
    expect(event!.body).toBe(`Please check @[${t.lead.userId}] and @[${t.handler2.userId}]. Also @[${t.handler.userId}].`);
    expect((event!.metadata as { mentions: string[] }).mentions).toEqual([t.lead.userId, t.handler2.userId, t.handler.userId]);
    const mention = (await forUser(t.lead.userId, "case_mention")).at(-1)!;
    expect(mention).toMatchObject({ href: `/admin/cases/${c.id}#case-timeline`, dedupeKey: `mention:${eventId}` });
    expect(mention.params).toEqual({ actor: "Handler One", reference: c.reference });
    expect((await forUser(t.handler2.userId, "case_mention")).length).toBe(1);
    expect(await forUser(t.handler.userId, "case_mention")).toHaveLength(0);
    const timeline = await staffTimeline(t.db, c.id, t.handler);
    expect(timeline.find((e) => e.id === eventId)!.body).toContain(`@[${t.lead.userId}]`);
  });

  it("only offers, and only notifies, staff who work the service", async () => {
    const editor = await t.staff("Editor Person", "editor", "tusu");
    const c = await lost();
    expect((await listMentionable(t.db, c.id, "lost_found")).map((p) => p.id)).not.toContain(editor.userId);
    const id = await addNote(t.db, c.id, "Hello @Editor Person", t.handler, { now: NOW });
    const [event] = await t.db.select().from(caseEvents).where(eq(caseEvents.id, id));
    expect(event!.body).toBe("Hello @Editor Person");
    expect(event!.metadata).toBeNull();
    expect(await forUser(editor.userId)).toHaveLength(0);
  });

  it("never reaches staff who cannot see a restricted complaint, and does reach the ones named", async () => {
    const restricted = await t.file({ key: "harassment" });
    const second = await t.staff("Second Named", "officer", "tusu");
    const { grantCategoryAccess } = await import("@/lib/complaints/categories");
    expect((await listMentionable(t.db, restricted.caseId, "complaint")).map((p) => p.id)).toEqual([t.named.userId]);
    const id = await addNote(t.db, restricted.caseId, "Loop in @Lead and @Admin and @Second Named", t.named, { now: NOW });
    const [event] = await t.db.select().from(caseEvents).where(eq(caseEvents.id, id));
    expect(event!.body).toBe("Loop in @Lead and @Admin and @Second Named");
    expect(await forUser(t.lead.userId, "case_mention")).toHaveLength(1);
    expect(await forUser(t.admin.userId)).toHaveLength(0);
    expect(await forUser(second.userId)).toHaveLength(0);

    const category = await t.category("harassment");
    await grantCategoryAccess(t.db, category.id, second.userId, t.admin, { now: NOW });
    const again = await addNote(t.db, restricted.caseId, "Now @Second Named can see it", t.named, { now: NOW });
    const [ev2] = await t.db.select().from(caseEvents).where(eq(caseEvents.id, again));
    expect(ev2!.body).toBe(`Now @[${second.userId}] can see it`);
    expect(await forUser(second.userId, "case_mention")).toHaveLength(1);
  });

  it("is rolled back with the note", async () => {
    const before = (await t.db.select().from(notifications)).length;
    const c = await lost();
    await expect(addNote(t.db, c.id, "@Lead " + "x".repeat(5000), t.handler, { now: NOW })).rejects.toMatchObject({ code: "invalid" });
    expect((await t.db.select().from(notifications)).length).toBe(before);
  });
});

describe("complaint escalated", () => {
  it("tells every officer and administrator for an ordinary complaint, and only the named staff for a restricted one, once", async () => {
    const ordinary = await t.file({ key: "facilities" });
    const restricted = await t.file({ key: "harassment" });
    const later = new Date(NOW.getTime() + 4 * 86_400_000);
    const escalated = await escalateOverdue(t.db, later);
    expect(escalated.map((e) => e.caseId)).toEqual(expect.arrayContaining([ordinary.caseId, restricted.caseId]));

    const recipients = async (caseId: string) =>
      (await t.db.select({ userId: notifications.userId }).from(notifications).where(and(eq(notifications.kind, "complaint_escalated"), eq(notifications.entityId, caseId)))).map((r) => r.userId).sort();
    const [second] = await t.db.select({ id: user.id }).from(user).where(eq(user.name, "Second Named"));
    const namedOnRestricted = [t.named.userId, second!.id].sort();
    expect(await recipients(ordinary.caseId)).toEqual([t.handler.userId, t.handler2.userId, t.lead.userId, t.admin.userId, ...namedOnRestricted].sort());
    expect(await recipients(restricted.caseId)).toEqual(namedOnRestricted);

    const [n] = await t.db.select().from(notifications).where(and(eq(notifications.userId, t.lead.userId), eq(notifications.entityId, ordinary.caseId)));
    expect(n).toMatchObject({ href: `/admin/cases/${ordinary.caseId}`, dedupeKey: `escalated:${ordinary.caseId}:acknowledge` });
    expect(renderNotification(n!, "en").body).toBe(`${ordinary.reference} was not acknowledged by its target date.`);

    await escalateOverdue(t.db, later);
    expect(await recipients(ordinary.caseId)).toHaveLength(6);

    const afterResolve = new Date(NOW.getTime() + 20 * 86_400_000);
    await escalateOverdue(t.db, afterResolve);
    const all = await t.db.select().from(notifications).where(and(eq(notifications.userId, t.lead.userId), eq(notifications.entityId, ordinary.caseId)));
    expect(all.map((r) => r.params.reason).sort()).toEqual(["acknowledge", "resolve"]);
  });
});

describe("reading", () => {
  it("counts, filters, pages and marks read only the person's own", async () => {
    const lead = t.lead.userId;
    const unread = await countUnread(t.db, lead);
    expect(unread).toBeGreaterThan(2);
    const list = await listNotifications(t.db, lead, parseNotificationQuery({ view: "unread" }));
    expect(list.total).toBe(unread);
    expect(list.rows.every((r) => r.userId === lead && r.readAt === null)).toBe(true);
    const mentionsOnly = await listNotifications(t.db, lead, parseNotificationQuery({ view: "all", kind: "case_mention" }));
    expect(mentionsOnly.rows.every((r) => r.kind === "case_mention")).toBe(true);
    expect(parseNotificationQuery({ kind: "nonsense", page: "-3" })).toEqual({ view: "unread", kind: undefined, page: 1 });

    const target = list.rows[0]!;
    expect(await markRead(t.db, t.handler.userId, [target.id])).toBe(0);
    expect((await getNotification(t.db, t.handler.userId, target.id))).toBeUndefined();
    expect(await markRead(t.db, lead, [target.id])).toBe(1);
    expect(await markRead(t.db, lead, [target.id])).toBe(0);
    expect(await countUnread(t.db, lead)).toBe(unread - 1);

    const only = await markAllRead(t.db, lead, "complaint_escalated");
    expect(only).toBeGreaterThan(0);
    expect(await countUnread(t.db, lead)).toBeGreaterThan(0);
    await markAllRead(t.db, lead);
    expect(await countUnread(t.db, lead)).toBe(0);
    expect(await countUnread(t.db, t.admin.userId)).toBeGreaterThan(0);
  });

  it("only ever links inside the console", () => {
    expect(safeConsoleHref("/admin/cases/abc#case-timeline")).toBe("/admin/cases/abc#case-timeline");
    for (const bad of ["https://evil.example", "//evil.example", "/admin//evil", "/administrator", "/\\evil", "javascript:alert(1)"]) expect(safeConsoleHref(bad)).toBe("/admin/notifications");
  });

  it("deletes with the user", async () => {
    await t.db.insert(user).values({ id: "gone", name: "Gone", email: "gone@example.test" });
    await t.db.insert(notifications).values({ userId: "gone", kind: "case_assigned", href: "/admin" });
    await t.db.delete(user).where(eq(user.id, "gone"));
    expect(await forUser("gone")).toHaveLength(0);
  });
});
