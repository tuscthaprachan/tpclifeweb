import { beforeAll, describe, expect, it } from "vitest";
import { AUDIT_SYSTEM_ACTOR, auditCsv, exportAuditEntries, listAuditActors, listAuditEntries, parseAuditFilters, recordHistory } from "@/lib/admin/audit/query";
import { recordAudit } from "@/lib/db/audit";
import { dayStart } from "@/lib/borrowing/time";
import { auditLog } from "@/lib/db/schema/audit-log";
import { setup } from "../cases/helpers";

type Ctx = Awaited<ReturnType<typeof setup>>;

let t: Ctx;
let admin: string;
let other: string;

async function insert(action: string, entityType: string, entityId: string, actorUserId: string | null, occurredAt: Date, extra: { before?: unknown; after?: unknown } = {}) {
  await t.db.insert(auditLog).values({ action, entityType, entityId, actorUserId, occurredAt, before: extra.before ?? null, after: extra.after ?? null });
}

beforeAll(async () => {
  t = await setup();
  admin = (await t.staff("Alice Admin", "admin")).userId;
  other = (await t.staff("Bob Editor", "editor")).userId;
  await insert("news_posts.create", "news_posts", "n1", other, new Date("2026-03-01T03:00:00Z"), { after: { title: "A" } });
  await insert("news_posts.update", "news_posts", "n1", other, new Date("2026-03-02T03:00:00Z"), { before: { title: "A" }, after: { title: "B" } });
  await insert("staff_member.update", "staff_member", "u-1", admin, new Date("2026-03-03T03:00:00Z"));
  await insert("cron.run", "cron", "retention", null, new Date("2026-03-04T03:00:00Z"), { after: { purged: 2 } });
  await insert("faq.create", "faqs", "f=1,x", other, new Date("2026-03-05T20:00:00Z"));
});

const filters = (over: Record<string, string> = {}) => parseAuditFilters(over);

describe("audit filters", () => {
  it("lists newest first with actor names, and System for no actor", async () => {
    const page = await listAuditEntries(t.db, filters(), admin);
    expect(page.total).toBe(5);
    expect(page.rows[0]!.action).toBe("faq.create");
    expect(page.rows.find((r) => r.action === "cron.run")).toMatchObject({ actorUserId: null, actorName: null });
    expect(page.rows.find((r) => r.action === "staff_member.update")!.actorName).toBe("Alice Admin");
  });

  it("filters by actor, including the system", async () => {
    expect((await listAuditEntries(t.db, filters({ actor: other }), admin)).total).toBe(3);
    const system = await listAuditEntries(t.db, filters({ actor: AUDIT_SYSTEM_ACTOR }), admin);
    expect(system.rows.map((r) => r.action)).toEqual(["cron.run"]);
  });

  it("filters by action prefix, entity type and exact entity id", async () => {
    expect((await listAuditEntries(t.db, filters({ action: "news_posts." }), admin)).total).toBe(2);
    expect((await listAuditEntries(t.db, filters({ entityType: "staff_member" }), admin)).total).toBe(1);
    expect((await listAuditEntries(t.db, filters({ entityId: "n1" }), admin)).total).toBe(2);
    expect((await listAuditEntries(t.db, filters({ action: "%" }), admin)).total).toBe(0);
  });

  it("matches free text inside the entity id, with wildcards taken literally", async () => {
    expect((await listAuditEntries(t.db, filters({ q: "u-" }), admin)).total).toBe(1);
    expect((await listAuditEntries(t.db, filters({ q: "=1," }), admin)).total).toBe(1);
    expect((await listAuditEntries(t.db, filters({ q: "_" }), admin)).total).toBe(0);
  });

  it("filters by Bangkok date range, inclusive of both days", async () => {
    const day = await listAuditEntries(t.db, filters({ from: "2026-03-02", to: "2026-03-02" }), admin);
    expect(day.rows.map((r) => r.action)).toEqual(["news_posts.update"]);
    // 20:00 UTC on 5 March is 03:00 on 6 March in Bangkok.
    expect((await listAuditEntries(t.db, filters({ from: "2026-03-06", to: "2026-03-06" }), admin)).rows.map((r) => r.action)).toEqual(["faq.create"]);
    expect((await listAuditEntries(t.db, filters({ from: "2026-03-05", to: "2026-03-05" }), admin)).total).toBe(0);
    expect(dayStart("2026-03-02").toISOString()).toBe("2026-03-01T17:00:00.000Z");
  });

  it("pages and clamps the page number", async () => {
    const first = await listAuditEntries(t.db, filters(), admin, 2);
    expect(first.rows).toHaveLength(2);
    const last = await listAuditEntries(t.db, filters({ page: "99" }), admin, 2);
    expect(last.page).toBe(3);
    expect(last.rows).toHaveLength(1);
  });

  it("drops malformed input", () => {
    expect(parseAuditFilters({ from: "yesterday", to: "2026-13-45", page: "-3", actor: " " })).toEqual({
      actor: undefined,
      action: undefined,
      entityType: undefined,
      entityId: undefined,
      from: undefined,
      to: undefined,
      q: undefined,
      page: 1,
    });
  });

  it("lists actors for the picker and the history of one record", async () => {
    expect((await listAuditActors(t.db)).map((a) => a.name).sort()).toEqual(["Alice Admin", "Bob Editor"]);
    expect((await recordHistory(t.db, "news_posts", "n1", admin)).map((r) => r.action)).toEqual(["news_posts.update", "news_posts.create"]);
  });

  it("exports CSV with a byte order mark, escaping and a guard against formulas", async () => {
    await recordAudit(t.db, { action: "x.test", entityType: "x", entityId: "=SUM(A1)", after: { note: 'a "quoted", value' } });
    const rows = await exportAuditEntries(t.db, filters({ action: "x.test" }), admin);
    const csv = auditCsv(rows);
    expect(csv.startsWith("﻿occurred_at,actor_id")).toBe(true);
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain('"{""note"":""a \\""quoted\\"", value""}"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
