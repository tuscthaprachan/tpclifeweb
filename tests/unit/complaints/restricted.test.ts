/**
 * Restricted categories: a complaint in one is visible only to the staff named
 * on it, in EVERY staff read and write path. A refused case is `not_found`.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  addContact,
  addNote,
  addPublicUpdate,
  assign,
  getCase,
  issueTrackingLink,
  listContactSummaries,
  listCases,
  readContacts,
  revokeTrackingLinks,
  staffTimeline,
  transition,
} from "@/lib/cases";
import { canSeeCase } from "@/lib/cases/restrictions";
import { CategoryError, grantCategoryAccess, listCategoryAccess, revokeCategoryAccess, updateCategory } from "@/lib/complaints/categories";
import { getComplaintFacts, readComplaintText, readEvidence } from "@/lib/complaints/details";
import { acknowledgeComplaint, closeComplaint, recategoriseComplaint, resolveComplaint, routeToWellbeing, startComplaint } from "@/lib/complaints/workflow";
import { createTestDb } from "../db/harness";
import { complaintCategories, cases } from "@/lib/db/schema";
import { MemoryStorage } from "@/lib/storage";
import { env, setupComplaints, NOW, type Ctx } from "./helpers";

let t: Ctx;
let restricted: { caseId: string; reference: string };
let open: { caseId: string; reference: string };
const notFound = { code: "not_found" };

beforeAll(async () => {
  t = await setupComplaints();
  restricted = await t.file({ key: "harassment" });
  open = await t.file({ key: "facilities" });
});

describe("a handler who is not named", () => {
  it("does not see the restricted complaint in the inbox, and sees the ordinary one", async () => {
    const list = await listCases(t.db, t.handler, { service: "complaint", now: NOW });
    const refs = list.rows.map((r) => r.reference);
    expect(refs).toContain(open.reference);
    expect(refs).not.toContain(restricted.reference);
    expect(list.total).toBe(list.rows.length);
  });

  it("is refused on every read and write of that case (as not found)", async () => {
    const id = restricted.caseId;
    const h = t.handler;
    await expect(getCase(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(staffTimeline(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(listContactSummaries(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(readContacts(t.db, id, h, { env })).rejects.toMatchObject(notFound);
    await expect(addContact(t.db, id, { role: "reporter", name: "X" }, h, { env })).rejects.toMatchObject(notFound);
    await expect(addNote(t.db, id, "peek", h)).rejects.toMatchObject(notFound);
    await expect(addPublicUpdate(t.db, id, { en: "hello" }, h)).rejects.toMatchObject(notFound);
    await expect(assign(t.db, id, h.userId, h)).rejects.toMatchObject(notFound);
    await expect(transition(t.db, id, "in_progress", h)).rejects.toMatchObject(notFound);
    await expect(issueTrackingLink(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(revokeTrackingLinks(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(getComplaintFacts(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(readComplaintText(t.db, id, h, { env })).rejects.toMatchObject(notFound);
    await expect(readEvidence(t.db, id, h, () => new MemoryStorage(), { env })).rejects.toMatchObject(notFound);
    await expect(acknowledgeComplaint(t.db, id, {}, h)).rejects.toMatchObject(notFound);
    await expect(startComplaint(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(resolveComplaint(t.db, id, { outcome: { en: "x" } }, h)).rejects.toMatchObject(notFound);
    await expect(closeComplaint(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(routeToWellbeing(t.db, id, h)).rejects.toMatchObject(notFound);
    await expect(recategoriseComplaint(t.db, id, (await t.category("other")).id, h)).rejects.toMatchObject(notFound);
    // Nothing was written by any of those.
    const events = await t.db.select().from((await import("@/lib/db/schema")).caseEvents).where(eq((await import("@/lib/db/schema")).caseEvents.caseId, id));
    expect(events.map((e) => e.type).sort()).toEqual(["contact_added", "created", "tracking_link_issued"]);
  });

  it("includes unit leads and admins who are not named", async () => {
    for (const who of [t.lead, t.admin, t.handler2]) {
      expect(await canSeeCase(t.db, restricted.caseId, who.userId)).toBe(false);
      await expect(getCase(t.db, restricted.caseId, who)).rejects.toMatchObject(notFound);
      expect((await listCases(t.db, who, { now: NOW })).rows.map((r) => r.reference)).not.toContain(restricted.reference);
    }
  });

  it("cannot be handed the case either: assignment needs the assignee to see it", async () => {
    await expect(assign(t.db, restricted.caseId, t.handler.userId, t.named)).rejects.toMatchObject({ code: "invalid" });
    await assign(t.db, restricted.caseId, t.named.userId, t.named);
    expect((await t.db.select().from(cases).where(eq(cases.id, restricted.caseId)))[0]!.assignedTo).toBe(t.named.userId);
  });
});

describe("a named handler", () => {
  it("sees and works the restricted complaint, and the contact read is logged", async () => {
    const list = await listCases(t.db, t.named, { now: NOW });
    expect(list.rows.map((r) => r.reference)).toEqual(expect.arrayContaining([restricted.reference, open.reference]));
    expect((await getCase(t.db, restricted.caseId, t.named)).reference).toBe(restricted.reference);
    const contacts = await readContacts(t.db, restricted.caseId, t.named, { env });
    expect(contacts[0]!.email).toBe("somchai@example.com");
    const text = await readComplaintText(t.db, restricted.caseId, t.named, { env });
    expect(text?.description).toContain("tap in room 301");
    const types = (await staffTimeline(t.db, restricted.caseId, t.named)).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(["contact_viewed", "details_viewed"]));
  });

  it("the overdue filter does not leak restricted complaints either", async () => {
    const late = new Date(NOW.getTime() + 60 * 86_400_000);
    const seen = (await listCases(t.db, t.handler, { overdue: true, now: late })).rows.map((r) => r.reference);
    expect(seen).toContain(open.reference);
    expect(seen).not.toContain(restricted.reference);
    const named = (await listCases(t.db, t.named, { overdue: true, now: late })).rows;
    expect(named.map((r) => r.reference)).toContain(restricted.reference);
    expect(named.find((r) => r.reference === restricted.reference)!.overdue).toBe(true);
  });
});

describe("moving between categories re-checks access", () => {
  it("moving INTO a restricted category hides it from a handler who is not named and unassigns them", async () => {
    const c = await t.file({ key: "other" });
    await assign(t.db, c.caseId, t.handler.userId, t.handler);
    const out = await recategoriseComplaint(t.db, c.caseId, (await t.category("safety")).id, t.handler, { now: NOW });
    expect(out).toEqual({ stillVisible: false, unassigned: true });
    await expect(getCase(t.db, c.caseId, t.handler)).rejects.toMatchObject(notFound);
    expect((await t.db.select().from(cases).where(eq(cases.id, c.caseId)))[0]!.assignedTo).toBeNull();
    expect((await getCase(t.db, c.caseId, t.named)).id).toBe(c.caseId);
  });

  it("moving OUT needs an explicit confirmation, then every handler can see it", async () => {
    const c = await t.file({ key: "safety" });
    const other = (await t.category("other")).id;
    await expect(recategoriseComplaint(t.db, c.caseId, other, t.named)).rejects.toMatchObject({ code: "needs_confirm" });
    expect(await canSeeCase(t.db, c.caseId, t.handler.userId)).toBe(false);
    await recategoriseComplaint(t.db, c.caseId, other, t.named, { confirmUnrestrict: true });
    expect(await canSeeCase(t.db, c.caseId, t.handler.userId)).toBe(true);
  });
});

describe("managing the named list", () => {
  it("only an admin may, the person must hold a complaints role, and the last name cannot go while restricted", async () => {
    const cat = await t.category("harassment");
    await expect(grantCategoryAccess(t.db, cat.id, t.handler.userId, t.handler)).rejects.toMatchObject({ code: "forbidden" });
    await expect(listCategoryAccess(t.db, cat.id, t.lead)).rejects.toBeInstanceOf(CategoryError);
    await expect(grantCategoryAccess(t.db, cat.id, "nobody", t.admin)).rejects.toMatchObject({ code: "invalid" });
    await expect(revokeCategoryAccess(t.db, cat.id, t.named.userId, t.admin)).rejects.toMatchObject({ code: "no_staff" });
    await grantCategoryAccess(t.db, cat.id, t.handler2.userId, t.admin);
    expect((await listCategoryAccess(t.db, cat.id, t.admin)).map((p) => p.userId).sort()).toEqual([t.handler2.userId, t.named.userId].sort());
    expect(await canSeeCase(t.db, restricted.caseId, t.handler2.userId)).toBe(true);
    await revokeCategoryAccess(t.db, cat.id, t.handler2.userId, t.admin);
    expect(await canSeeCase(t.db, restricted.caseId, t.handler2.userId)).toBe(false);
  });

  it("revoking a name unassigns their restricted cases", async () => {
    const c = await t.file({ key: "safety" });
    const safety = await t.category("safety");
    await grantCategoryAccess(t.db, safety.id, t.handler2.userId, t.admin);
    await assign(t.db, c.caseId, t.handler2.userId, t.named);
    await revokeCategoryAccess(t.db, safety.id, t.handler2.userId, t.admin);
    expect((await t.db.select().from(cases).where(eq(cases.id, c.caseId)))[0]!.assignedTo).toBeNull();
  });

  it("removing a restriction needs a yes when it holds complaints; restricting needs a named person", async () => {
    const cat = await t.category("safety");
    const input = { nameTh: cat.nameTh, nameEn: cat.nameEn, hintTh: cat.hintTh, hintEn: cat.hintEn, acknowledgeDays: 1, resolveDays: 10, restricted: false, offerWellbeing: true, position: 20, active: true };
    await expect(updateCategory(t.db, cat.id, input, t.admin)).rejects.toMatchObject({ code: "needs_confirm" });
    const fresh = await createTestDb();
    const other = await t.category("other");
    // "other" has nobody named, so it cannot be restricted yet.
    await expect(updateCategory(t.db, other.id, { ...input, nameTh: "x", nameEn: "x", restricted: true }, t.admin)).rejects.toMatchObject({ code: "no_staff" });
    void fresh;
    expect((await t.db.select().from(complaintCategories).where(eq(complaintCategories.id, cat.id)))[0]!.restricted).toBe(true);
  });
});
