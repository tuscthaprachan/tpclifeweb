/** Inbox sorting and the due indicator, bulk actions, saved views and the CSV export. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { addNote, assign, createCase, listCases, transition } from "@/lib/cases";
import type { CaseListFilters } from "@/lib/cases/engine";
import { bulkAssign, bulkTransition, caseBulkParams, CASE_BULK_LIMIT, parseCaseBulkReport, parseCaseIds } from "@/lib/cases/bulk";
import { dueState } from "@/lib/cases/due";
import { buildCaseCsv, CASE_EXPORT_HEADER } from "@/lib/cases/export";
import { canonicalViewQuery, inboxHref, inboxParams, nextCaseSort, parseInboxQuery } from "@/lib/cases/inbox-query";
import { createView, deleteView, listViews, updateView, VIEWS_PER_PERSON } from "@/lib/cases/views";
import { auditLog, cases, complaintCases, savedCaseViews, user } from "@/lib/db/schema";
import { CSV_BOM } from "@/lib/admin/content/csv";
import { setupComplaints, NOW, type Ctx } from "../complaints/helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let t: Ctx;
const DAY = 86_400_000;
const lostCase = (offsetDays: number, summary = "Black umbrella") => createCase(t.db, { service: "lost_found", kind: "lost", summary }, { kind: "public" }, { now: new Date(NOW.getTime() + offsetDays * DAY) });
const allowed = { services: ["lost_found", "complaint", "borrowing"], statuses: ["submitted", "searching", "received"] };

beforeAll(async () => {
  t = await setupComplaints();
});

describe("the inbox query string", () => {
  it("reads sort and filters, drops what this person may not use, and keeps defaults out of links", () => {
    const q = parseInboxQuery({ service: "nonsense", status: "searching", assignee: "me", sort: "due", q: " CP-2026 ", open: "1" }, allowed);
    expect(q).toMatchObject({ service: undefined, status: "searching", assignee: "me", q: "CP-2026", open: true, sort: "due", dir: "asc", page: 1 });
    expect(parseInboxQuery({ sort: "bogus", dir: "sideways", page: "-4" }, allowed)).toMatchObject({ sort: "updated", dir: "desc", page: 1 });
    expect(parseInboxQuery({ sort: "reference", dir: "desc" }, allowed)).toMatchObject({ sort: "reference", dir: "desc" });
    expect(inboxParams(parseInboxQuery({}, allowed))).toBe("");
    expect(inboxParams(q)).toBe("status=searching&assignee=me&q=CP-2026&open=1&sort=due&dir=asc");
    expect(inboxHref(q, { page: 3 })).toBe("/admin/cases?status=searching&assignee=me&q=CP-2026&open=1&sort=due&dir=asc&page=3");
  });

  it("flips the direction of the sorted column and starts another at its natural direction", () => {
    const q = parseInboxQuery({}, allowed);
    expect(nextCaseSort(q, "updated")).toMatchObject({ sort: "updated", dir: "asc" });
    expect(nextCaseSort(q, "reference")).toMatchObject({ sort: "reference", dir: "asc" });
    expect(nextCaseSort(q, "received")).toMatchObject({ sort: "received", dir: "desc" });
    expect(nextCaseSort({ sort: "reference", dir: "asc" }, "reference")).toMatchObject({ dir: "desc" });
  });

  it("reduces a saved query to filters and sort in a fixed order", () => {
    expect(canonicalViewQuery("?page=4&q=x&service=complaint&bogus=1&dir=asc&sort=due")).toBe("service=complaint&q=x&sort=due&dir=asc");
    expect(canonicalViewQuery("q=" + "y".repeat(200))).toBe("");
  });
});

describe("sorting the inbox", () => {
  it("sorts by reference, received, status and due, in both directions, and by updated by default", async () => {
    const a = await lostCase(-3);
    const b = await lostCase(-2);
    const c = await lostCase(-1);
    await transition(t.db, a.id, "searching", t.handler, { now: new Date(NOW.getTime() + 5 * DAY) });
    const ids = async (sort: Omit<CaseListFilters, "service">) => (await listCases(t.db, t.handler, { service: "lost_found", ...sort })).rows.map((r) => r.id);

    expect(await ids({})).toEqual([a.id, c.id, b.id]);
    expect(await ids({ sort: "updated", dir: "asc" })).toEqual([b.id, c.id, a.id]);
    expect((await ids({ sort: "received", dir: "asc" })).filter((id) => [a.id, b.id, c.id].includes(id))).toEqual([a.id, b.id, c.id]);
    expect((await ids({ sort: "received" })).filter((id) => [a.id, b.id, c.id].includes(id))).toEqual([c.id, b.id, a.id]);
    const byRef = (await ids({ sort: "reference", dir: "asc" })).filter((id) => [a.id, b.id, c.id].includes(id));
    expect(byRef).toEqual([a, b, c].sort((x, y) => x.reference.localeCompare(y.reference)).map((x) => x.id));
    expect((await ids({ sort: "reference", dir: "desc" })).filter((id) => [a.id, b.id, c.id].includes(id))).toEqual(byRef.reverse());
    const byStatus = (await listCases(t.db, t.handler, { service: "lost_found", sort: "status", dir: "asc" })).rows.map((r) => r.status);
    expect(byStatus).toEqual([...byStatus].sort());
  });

  it("sorts by due date with the cases that have none last, and tags each row's state", async () => {
    const soon = await t.file({ key: "facilities" });
    const loose = await lostCase(0);
    const rows = async (dir: "asc" | "desc", now: Date) => (await listCases(t.db, t.handler, { sort: "due", dir, now, openOnly: true })).rows;
    const asc = await rows("asc", NOW);
    const dueRows = asc.filter((r) => r.dueAt);
    expect(dueRows.length).toBeGreaterThan(0);
    expect(dueRows.map((r) => r.dueAt!.getTime())).toEqual([...dueRows.map((r) => r.dueAt!.getTime())].sort((x, y) => x - y));
    expect(asc.slice(dueRows.length).every((r) => r.dueAt === null && r.dueState === null)).toBe(true);
    const desc = await rows("desc", NOW);
    expect(desc.slice(0, dueRows.length).every((r) => r.dueAt !== null)).toBe(true);
    expect(desc.at(-1)!.dueAt).toBeNull();
    expect(asc.find((r) => r.id === loose.id)!.dueState).toBeNull();

    const row = (now: Date) => listCases(t.db, t.handler, { service: "complaint", now }).then((l) => l.rows.find((r) => r.id === soon.caseId)!);
    expect((await row(NOW)).dueState).toBe("on_time");
    expect((await row(new Date(NOW.getTime() + 2 * DAY))).dueState).toBe("soon");
    expect((await row(new Date(NOW.getTime() + 4 * DAY))).dueState).toBe("overdue");
  });

  it("is only about cases the person may see", async () => {
    const hidden = await t.file({ key: "harassment" });
    expect((await listCases(t.db, t.handler, { sort: "due" })).rows.map((r) => r.id)).not.toContain(hidden.caseId);
    expect((await listCases(t.db, t.named, { sort: "due" })).rows.map((r) => r.id)).toContain(hidden.caseId);
  });
});

describe("the due indicator", () => {
  const monday = NOW;
  it("is overdue when past, due soon by the end of the next working day, otherwise on time", () => {
    expect(dueState(null, monday)).toBeNull();
    expect(dueState(new Date(monday.getTime() - 1000), monday)).toBe("overdue");
    expect(dueState(new Date("2026-03-10T09:00:00Z"), monday)).toBe("soon");
    expect(dueState(new Date("2026-03-10T16:59:59Z"), monday)).toBe("soon");
    expect(dueState(new Date("2026-03-10T17:01:00Z"), monday)).toBe("on_time");
    expect(dueState(new Date("2026-03-20T09:00:00Z"), monday)).toBe("on_time");
    const friday = new Date("2026-03-13T05:00:00Z");
    expect(dueState(new Date("2026-03-16T09:00:00Z"), friday)).toBe("soon");
  });

  it("has no date once a complaint is closed", async () => {
    const c = await t.file({ key: "facilities" });
    const { resolveComplaint } = await import("@/lib/complaints/workflow");
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "Done" } }, t.handler, { now: NOW });
    const row = (await listCases(t.db, t.handler, { service: "complaint" })).rows.find((r) => r.id === c.caseId)!;
    expect([row.dueAt, row.dueState]).toEqual([null, null]);
  });
});

describe("bulk actions", () => {
  it("parses ids and round-trips a report through the address", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(parseCaseIds([id, id, "nope", 5, id.toUpperCase()])).toEqual([id, id.toUpperCase()]);
    expect(parseCaseIds(Array.from({ length: 150 }, (_, i) => `123e4567-e89b-12d3-a456-${String(i).padStart(12, "0")}`))).toHaveLength(CASE_BULK_LIMIT);
    const params = caseBulkParams("assign", { done: [id], failed: [{ id, reason: "not_found" }] });
    const back = parseCaseBulkReport({ bulk: params.get("bulk")!, ok: params.get("ok")!, fail: params.getAll("fail") });
    expect(back).toEqual({ action: "assign", ok: 1, failed: [{ id, reason: "not_found" }] });
    expect(parseCaseBulkReport({ bulk: "delete" })).toBeUndefined();
    expect(parseCaseBulkReport({ bulk: "assign", fail: ["bad.reason", `${id}.nope`] })?.failed).toEqual([]);
  });

  it("assigns what it can and reports the rest by reason", async () => {
    const one = await lostCase(0);
    const two = await lostCase(0);
    const hidden = await t.file({ key: "harassment" });
    const missing = "123e4567-e89b-12d3-a456-426614174000";
    const result = await bulkAssign(t.db, [one.id, two.id, hidden.caseId, missing], t.lead.userId, t.handler, { now: NOW });
    expect(result.done).toEqual([one.id, two.id]);
    expect(result.failed).toEqual([
      { id: hidden.caseId, reason: "not_found" },
      { id: missing, reason: "not_found" },
    ]);
    const [assigned] = await t.db.select({ assignedTo: cases.assignedTo }).from(cases).where(eq(cases.id, one.id));
    expect(assigned!.assignedTo).toBe(t.lead.userId);
    const audits = await t.db.select().from(auditLog).where(eq(auditLog.entityId, two.id));
    expect(audits.map((x) => x.action)).toContain("case.assign");

    const editor = await t.staff("Not Staff Here", "editor", "tusu");
    expect((await bulkAssign(t.db, [one.id], editor.userId, t.handler, { now: NOW })).failed).toEqual([{ id: one.id, reason: "assignee" }]);
    expect((await bulkAssign(t.db, [one.id, two.id], null, t.handler, { now: NOW })).done).toHaveLength(2);
    expect((await bulkAssign(t.db, [one.id], t.lead.userId, editor, { now: NOW })).failed).toEqual([{ id: one.id, reason: "forbidden" }]);
  });

  it("assigns a restricted complaint only to someone who can see it, for the person named on it", async () => {
    const hidden = await t.file({ key: "harassment" });
    expect(await bulkAssign(t.db, [hidden.caseId], t.lead.userId, t.named, { now: NOW })).toEqual({ done: [], failed: [{ id: hidden.caseId, reason: "assignee" }] });
    expect((await bulkAssign(t.db, [hidden.caseId], t.named.userId, t.named, { now: NOW })).done).toEqual([hidden.caseId]);
  });

  it("moves each case through the state machine, with a result per case, and keeps complaints and loans out", async () => {
    const ok = await lostCase(0);
    const stuck = await lostCase(0);
    await transition(t.db, stuck.id, "withdrawn", t.handler, { now: NOW });
    const complaint = await t.file({ key: "facilities" });
    const loan = await createCase(t.db, { service: "borrowing", kind: "loan" }, t.handler, { now: NOW });
    const result = await bulkTransition(t.db, [ok.id, stuck.id, complaint.caseId, loan.id, "123e4567-e89b-12d3-a456-426614174000"], "searching", t.handler, { now: NOW });
    expect(result.done).toEqual([ok.id]);
    expect(result.failed).toEqual([
      { id: stuck.id, reason: "invalid_transition" },
      { id: complaint.caseId, reason: "use_actions" },
      { id: loan.id, reason: "use_actions" },
      { id: "123e4567-e89b-12d3-a456-426614174000", reason: "not_found" },
    ]);
    const [moved] = await t.db.select().from(cases).where(eq(cases.id, ok.id));
    expect(moved!.status).toBe("searching");
    const [untouched] = await t.db.select().from(cases).where(eq(cases.id, loan.id));
    expect(untouched!.status).toBe("requested");
    const audits = (await t.db.select().from(auditLog).where(eq(auditLog.entityId, ok.id))).map((x) => x.action);
    expect(audits).toContain("case.transition");
    const [untouchedComplaint] = await t.db.select().from(cases).where(eq(cases.id, complaint.caseId));
    expect(untouchedComplaint!.status).toBe("received");
  });

  it("closes a case and moves the clocks exactly as a single transition does", async () => {
    const c = await lostCase(0);
    await bulkTransition(t.db, [c.id], "closed_unfound", t.handler, { now: NOW });
    const [row] = await t.db.select().from(cases).where(eq(cases.id, c.id));
    expect(row!.closedAt).toEqual(NOW);
    expect(row!.piiDeleteAfter).not.toBeNull();
  });
});

describe("saved views", () => {
  it("creates, lists, renames and deletes the owner's views, audited", async () => {
    const id = await createView(t.db, t.handler.userId, { name: "  My   open cases ", query: "?assignee=me&open=1&page=3&junk=1&sort=due&dir=asc" }, { ip: "203.0.113.9" });
    const mine = (await listViews(t.db, t.handler.userId)).find((v) => v.id === id)!;
    expect(mine).toMatchObject({ name: "My open cases", query: "assignee=me&open=1&sort=due&dir=asc", shared: false, mine: true, ownerName: "Handler One" });
    await updateView(t.db, t.handler.userId, id, { name: "Mine", shared: true });
    expect((await listViews(t.db, t.handler.userId)).find((v) => v.id === id)).toMatchObject({ name: "Mine", shared: true });
    await deleteView(t.db, t.handler.userId, id);
    expect((await listViews(t.db, t.handler.userId)).find((v) => v.id === id)).toBeUndefined();
    const audits = await t.db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(audits.map((x) => x.action)).toEqual(["case_view.create", "case_view.update", "case_view.delete"]);
    expect(audits[0]).toMatchObject({ actorUserId: t.handler.userId, ip: "203.0.113.9" });
  });

  it("keeps a view private until it is shared, and only its owner changes or deletes it", async () => {
    const id = await createView(t.db, t.handler.userId, { name: "Private", query: "open=1" });
    const shared = await createView(t.db, t.handler.userId, { name: "For everyone", query: "service=complaint", shared: true });
    const lead = await listViews(t.db, t.lead.userId);
    expect(lead.map((v) => v.id)).not.toContain(id);
    expect(lead.find((v) => v.id === shared)).toMatchObject({ mine: false, ownerName: "Handler One" });

    for (const attempt of [
      () => updateView(t.db, t.lead.userId, shared, { name: "Hijack" }),
      () => updateView(t.db, t.lead.userId, id, { shared: true }),
      () => deleteView(t.db, t.lead.userId, shared),
      () => deleteView(t.db, t.admin.userId, id),
    ]) await expect(attempt()).rejects.toMatchObject({ code: "not_found" });
    const [still] = await t.db.select().from(savedCaseViews).where(eq(savedCaseViews.id, shared));
    expect(still).toMatchObject({ name: "For everyone", shared: true });

    await updateView(t.db, t.handler.userId, shared, { shared: false });
    expect((await listViews(t.db, t.lead.userId)).map((v) => v.id)).not.toContain(shared);
  });

  it("checks the name and the number of views, and ignores a rename that changes nothing", async () => {
    await expect(createView(t.db, t.lead.userId, { name: "   ", query: "" })).rejects.toMatchObject({ code: "name" });
    await expect(createView(t.db, t.lead.userId, { name: "x".repeat(61), query: "" })).rejects.toMatchObject({ code: "name" });
    const id = await createView(t.db, t.lead.userId, { name: "Same", query: "" });
    await updateView(t.db, t.lead.userId, id, { name: "Same" });
    expect((await t.db.select().from(auditLog).where(eq(auditLog.entityId, id))).map((x) => x.action)).toEqual(["case_view.create"]);
    for (let i = 0; i < VIEWS_PER_PERSON - 1; i++) await createView(t.db, t.lead.userId, { name: `v${i}`, query: "" });
    await expect(createView(t.db, t.lead.userId, { name: "one too many", query: "" })).rejects.toMatchObject({ code: "limit" });
  });

  it("goes with the user", async () => {
    const gone = await t.staff("Leaver", "officer", "tusu");
    const id = await createView(t.db, gone.userId, { name: "Leaving", query: "" });
    await t.db.delete(user).where(eq(user.id, gone.userId));
    expect(await t.db.select().from(savedCaseViews).where(eq(savedCaseViews.id, id))).toHaveLength(0);
  });
});

describe("the CSV export", () => {
  it("has the agreed columns, a BOM and no personal data or free text", async () => {
    const c = await lostCase(0, "Blue wallet belonging to Somchai Tester, phone 0812345678");
    await addNote(t.db, c.id, "Called the owner on 0899999999", t.handler, { now: NOW });
    const complaint = await t.file({ key: "facilities", description: "Leaking tap, reporter Somchai Tester" });
    const { csv, count } = await buildCaseCsv(t.db, t.handler, { now: NOW });
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe(CASE_EXPORT_HEADER.join(","));
    expect(CASE_EXPORT_HEADER).toEqual(["reference", "service", "type", "category", "status", "assigned_to", "received", "due", "closed", "escalated"]);
    expect(lines).toHaveLength(count + 1);
    for (const secret of ["Somchai", "0812345678", "0899999999", "wallet", "tap", "somchai@example.com", "Blue"]) expect(csv).not.toContain(secret);
    expect(csv).toContain(c.reference);
    const row = lines.find((l) => l.startsWith(complaint.reference))!.split(",");
    expect(row.slice(0, 2)).toEqual([complaint.reference, "Complaints"]);
    expect(row[3]).not.toBe("");
    expect(row[7]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(row[9]).toBe("no");
  });

  it("follows the filters and sort, and flags escalated complaints", async () => {
    const c = await t.file({ key: "facilities" });
    const { escalateOverdue } = await import("@/lib/complaints/escalation");
    await escalateOverdue(t.db, new Date(NOW.getTime() + 4 * DAY));
    const only = await buildCaseCsv(t.db, t.handler, { escalated: true, service: "complaint", sort: "reference", dir: "asc" });
    const refs = only.csv.slice(1).trimEnd().split("\r\n").slice(1).map((l) => l.split(","));
    expect(refs.map((r) => r[0])).toContain(c.reference);
    expect(refs.every((r) => r[9] === "yes" && r[1] === "Complaints")).toBe(true);
    expect(refs.map((r) => r[0])).toEqual([...refs.map((r) => r[0])].sort());
    const [row] = await t.db.select({ r: complaintCases.escalatedAt }).from(complaintCases).where(eq(complaintCases.caseId, c.caseId));
    expect(row!.r).not.toBeNull();
  });

  it("leaves out restricted complaints unless the person is named on the category", async () => {
    const hidden = await t.file({ key: "harassment" });
    expect((await buildCaseCsv(t.db, t.handler)).csv).not.toContain(hidden.reference);
    expect((await buildCaseCsv(t.db, t.admin)).csv).not.toContain(hidden.reference);
    expect((await buildCaseCsv(t.db, t.named)).csv).toContain(hidden.reference);
  });

  it("neutralises text a spreadsheet would run as a formula", async () => {
    const evil = await t.staff("=HYPERLINK(\"http://evil.example\")", "officer", "tusu");
    const plus = await t.staff("+1 plus", "officer", "tusu");
    const c = await lostCase(0);
    await assign(t.db, c.id, evil.userId, t.handler, { now: NOW });
    const d = await lostCase(0);
    await assign(t.db, d.id, plus.userId, t.handler, { now: NOW });
    const { csv } = await buildCaseCsv(t.db, t.handler, { assignee: evil.userId });
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
    expect((await buildCaseCsv(t.db, t.handler, { assignee: plus.userId })).csv).toContain("'+1 plus");
  });

  it("is empty for staff with no case role", async () => {
    const editor = await t.staff("Only Editor", "editor", "tusu");
    const { csv, count } = await buildCaseCsv(t.db, editor);
    expect(count).toBe(0);
    expect(csv).toBe(`${CSV_BOM}${CASE_EXPORT_HEADER.join(",")}\r\n`);
  });
});
