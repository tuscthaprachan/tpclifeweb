import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  addContact,
  addNote,
  addPublicUpdate,
  assign,
  CaseError,
  createCase,
  getCase,
  listCases,
  listContactSummaries,
  publicCaseView,
  localisedBody,
  publicTimeline,
  readContacts,
  reencryptContacts,
  staffTimeline,
  transition,
  type StaffActor,
} from "@/lib/cases";
import { PiiUnavailableError } from "@/lib/crypto/pii";
import { auditLog, caseContacts, caseEvents, cases } from "@/lib/db/schema";
import { KEY_A, KEY_B, setup } from "./helpers";

let t: Awaited<ReturnType<typeof setup>>;
let officer: StaffActor;
let otherOrgOfficer: StaffActor;
let complaintsHandler: StaffActor;
let editor: StaffActor;

beforeAll(async () => {
  t = await setup();
  officer = await t.staff("Officer", "lf_officer", "tusu");
  otherOrgOfficer = await t.staff("Officer 2", "lf_officer", "tusc");
  complaintsHandler = await t.staff("Handler", "complaints_handler", "tusu");
  editor = await t.staff("Editor", "editor", "tusu");
});

const lost = { service: "lost_found", kind: "lost", summary: "Black umbrella" } as const;
const NOW = new Date("2026-03-01T03:00:00Z");

describe("references", () => {
  it("allocates per service and Bangkok year, gapless", async () => {
    const a = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    const b = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    const c = await createCase(t.db, { service: "complaint", kind: "complaint" }, { kind: "public" }, { now: NOW });
    expect(a.reference).toBe("LF-2026-0001");
    expect(b.reference).toBe("LF-2026-0002");
    expect(c.reference).toBe("CP-2026-0001");
  });

  it("uses the Bangkok year at the turn of the year", async () => {
    const a = await createCase(t.db, lost, { kind: "public" }, { now: new Date("2026-12-31T18:30:00Z") });
    expect(a.reference).toMatch(/^LF-2027-0001$/);
  });

  it("rejects an unknown kind and starts in the initial status", async () => {
    await expect(createCase(t.db, { service: "lost_found", kind: "stolen" }, { kind: "public" })).rejects.toMatchObject({ code: "invalid" });
    const found = await createCase(t.db, { service: "lost_found", kind: "found" }, officer);
    expect(found.status).toBe("logged");
  });

  it("forbids staff without a role in the service from opening a case", async () => {
    await expect(createCase(t.db, { service: "lost_found", kind: "lost" }, complaintsHandler)).rejects.toMatchObject({ code: "forbidden" });
    await expect(createCase(t.db, { service: "lost_found", kind: "lost" }, { ...officer, organisationId: 999 })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("transition", () => {
  it("moves along the machine, records events and audits", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    const row = await transition(t.db, c.id, "searching", officer, { now: new Date("2026-03-02T00:00:00Z") });
    expect(row.status).toBe("searching");
    const stored = await getCase(t.db, c.id, officer);
    expect(stored.actingOrganisationId).toBe(officer.organisationId);
    const events = await staffTimeline(t.db, c.id, officer);
    const changed = events.find((e) => e.type === "status_changed")!;
    expect([changed.fromStatus, changed.toStatus, changed.visibility, changed.actorName]).toEqual(["submitted", "searching", "public", "Officer"]);
    const audits = await t.db.select().from(auditLog).where(eq(auditLog.entityId, c.id));
    expect(audits.map((a) => a.action)).toEqual(expect.arrayContaining(["case.create", "case.transition"]));
  });

  it("refuses blocked transitions and leaves the case unchanged", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await expect(transition(t.db, c.id, "returned", officer)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(transition(t.db, c.id, "nonsense", officer)).rejects.toMatchObject({ code: "invalid_transition" });
    expect((await getCase(t.db, c.id, officer)).status).toBe("submitted");
  });

  it("refuses a stale form", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await transition(t.db, c.id, "searching", officer);
    await expect(transition(t.db, c.id, "match_found", otherOrgOfficer, { expectedFrom: "submitted" })).rejects.toMatchObject({ code: "stale" });
  });

  it("closing sets closed_at and pii_delete_after one year on; reopening clears them", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    const closeAt = new Date("2026-04-10T05:00:00Z");
    await transition(t.db, c.id, "closed_unfound", officer, { now: closeAt });
    let row = await getCase(t.db, c.id, officer);
    expect(row.closedAt).toEqual(closeAt);
    expect(row.piiDeleteAfter).toEqual(new Date("2027-04-10T05:00:00Z"));
    await transition(t.db, c.id, "searching", officer);
    row = await getCase(t.db, c.id, officer);
    expect(row.closedAt).toBeNull();
    expect(row.piiDeleteAfter).toBeNull();
  });

  it("lets the person withdraw but nothing else, and never the system", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await expect(transition(t.db, c.id, "searching", { kind: "public" })).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(transition(t.db, c.id, "withdrawn", { kind: "system" })).rejects.toMatchObject({ code: "forbidden" });
    await transition(t.db, c.id, "withdrawn", { kind: "public" });
    const events = await staffTimeline(t.db, c.id, officer);
    expect(events.at(-1)).toMatchObject({ toStatus: "withdrawn", actorUserId: null, actingOrganisationId: null });
  });

  it("keeps internal-only statuses internal and requires both languages on a note", async () => {
    const f = await createCase(t.db, { service: "lost_found", kind: "found" }, officer);
    await transition(t.db, f.id, "claim_pending", officer);
    await transition(t.db, f.id, "listed", officer, { note: { th: "วางที่โต๊ะ", en: "On the desk" } });
    const tl = await publicTimeline(t.db, f.id);
    expect(tl.at(-1)).toMatchObject({ title: { en: "Listed as found" }, body: { th: "วางที่โต๊ะ", en: "On the desk" } });
    await expect(transition(t.db, f.id, "claim_pending", officer, { note: { th: "x", en: "" } })).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("notes, updates, assignment and the public timeline", () => {
  it("public timeline excludes internal events and internal text", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await addNote(t.db, c.id, "Caller sounded unsure, check ID twice", officer);
    await addPublicUpdate(t.db, c.id, { th: "เรากำลังค้นหา", en: "We are searching" }, officer);
    await addContact(t.db, c.id, { role: "reporter", email: "a@example.org" }, { kind: "public" });
    await readContacts(t.db, c.id, officer);
    await assign(t.db, c.id, officer.userId, officer);
    await transition(t.db, c.id, "searching", officer);
    const timeline = await publicTimeline(t.db, c.id);
    expect(timeline.map((e) => e.type)).toEqual(["created", "public_update", "status_changed"]);
    expect(JSON.stringify(timeline)).not.toMatch(/unsure|a@example|assigned/);
    const view = await publicCaseView(t.db, c.id);
    expect(view.statusLabel.en).toBe("We are looking for it");
    expect(view.timeline).toHaveLength(3);
  });

  it("takes a public update in one language or both, and refuses an empty one", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await addPublicUpdate(t.db, c.id, { th: "", en: "Hello" }, officer);
    await addPublicUpdate(t.db, c.id, { th: "สวัสดี" }, officer);
    await addPublicUpdate(t.db, c.id, { th: " both ", en: " ทั้งสอง " }, officer);
    const bodies = (await publicTimeline(t.db, c.id)).filter((e) => e.type === "public_update").map((e) => e.body);
    // A blank language is stored as nothing, not as an empty string.
    expect(bodies).toEqual([
      { th: null, en: "Hello" },
      { th: "สวัสดี", en: null },
      { th: "both", en: "ทั้งสอง" },
    ]);
    await expect(addPublicUpdate(t.db, c.id, { th: "  ", en: "" }, officer)).rejects.toMatchObject({ code: "invalid" });
    await expect(addPublicUpdate(t.db, c.id, {}, officer)).rejects.toMatchObject({ code: "invalid" });
    await expect(addNote(t.db, c.id, "   ", officer)).rejects.toMatchObject({ code: "invalid" });
  });

  it("shows the reader's language, else the other with its own language", () => {
    expect(localisedBody({ th: "ไทย", en: "English" }, "en")).toEqual({ text: "English", lang: "en" });
    expect(localisedBody({ th: "ไทย", en: null }, "en")).toEqual({ text: "ไทย", lang: "th" });
    expect(localisedBody({ th: null, en: "English" }, "th")).toEqual({ text: "English", lang: "en" });
    expect(localisedBody({ th: " ", en: null }, "th")).toBeNull();
    expect(localisedBody(null, "en")).toBeNull();
  });

  it("keeps updates tagged with a claim off the public timeline", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await addPublicUpdate(t.db, c.id, { en: "For everyone" }, officer);
    await addPublicUpdate(t.db, c.id, { en: "For one claimant" }, officer, { metadata: { claimId: "11111111-1111-4111-8111-111111111111" } });
    const bodies = (await publicTimeline(t.db, c.id)).map((e) => e.body?.en).filter(Boolean);
    expect(bodies).toEqual(["For everyone"]);
  });


  it("only staff for the service can annotate", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await expect(addNote(t.db, c.id, "x", complaintsHandler)).rejects.toMatchObject({ code: "forbidden" });
    await expect(addNote(t.db, c.id, "x", editor)).rejects.toMatchObject({ code: "forbidden" });
    await expect(addNote(t.db, c.id, "x", { kind: "public" })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("assigns, only to someone who can work the service", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await assign(t.db, c.id, otherOrgOfficer.userId, officer);
    expect((await getCase(t.db, c.id, officer)).assignedTo).toBe(otherOrgOfficer.userId);
    await expect(assign(t.db, c.id, complaintsHandler.userId, officer)).rejects.toMatchObject({ code: "invalid" });
    await assign(t.db, c.id, null, officer);
    expect((await getCase(t.db, c.id, officer)).assignedTo).toBeNull();
  });

  it("the timeline events are append-only", async () => {
    const c = await createCase(t.db, lost, { kind: "public" }, { now: NOW });
    await expect(t.db.update(caseEvents).set({ body: "x" }).where(eq(caseEvents.caseId, c.id))).rejects.toThrow();
    await expect(t.db.delete(caseEvents).where(eq(caseEvents.caseId, c.id))).rejects.toThrow();
  });
});

describe("contacts", () => {
  it("stores ciphertext only and logs every view", async () => {
    const c = await createCase(
      t.db,
      { ...lost, contacts: [{ role: "reporter", name: "Somchai Jaidee", email: "somchai@example.org", phone: "0812345678", preferredContact: "email", consentContact: true }] },
      { kind: "public" },
      { now: NOW },
    );
    const [raw] = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, c.id));
    expect(JSON.stringify(raw)).not.toMatch(/Somchai|somchai|0812345678/);
    expect(raw!.nameEnc).toMatch(/^pii1\./);

    const summaries = await listContactSummaries(t.db, c.id, officer);
    expect(summaries[0]).toMatchObject({ role: "reporter", has: { name: true, email: true, phone: true, lineId: false }, consentContact: true });
    const before = (await staffTimeline(t.db, c.id, officer)).filter((e) => e.type === "contact_viewed");
    expect(before).toHaveLength(0);

    const contacts = await readContacts(t.db, c.id, officer);
    expect(contacts[0]).toMatchObject({ name: "Somchai Jaidee", email: "somchai@example.org", phone: "0812345678", lineId: null });
    await readContacts(t.db, c.id, otherOrgOfficer);

    const views = (await staffTimeline(t.db, c.id, officer)).filter((e) => e.type === "contact_viewed");
    expect(views.map((v) => v.actorName)).toEqual(["Officer", "Officer 2"]);
    expect(JSON.stringify(views)).not.toMatch(/somchai@/);
    const audits = await t.db.select().from(auditLog).where(eq(auditLog.action, "case_contact.view"));
    expect(audits.filter((a) => a.entityId === c.id)).toHaveLength(2);
  });

  it("refuses staff without access to read, and public readers", async () => {
    const c = await createCase(t.db, { ...lost, contacts: [{ role: "reporter", email: "x@example.org" }] }, { kind: "public" });
    await expect(readContacts(t.db, c.id, complaintsHandler)).rejects.toMatchObject({ code: "forbidden" });
    await expect(readContacts(t.db, c.id, { kind: "public" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(listContactSummaries(t.db, c.id, editor)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("reading a case with no contacts logs nothing", async () => {
    const c = await createCase(t.db, lost, { kind: "public" });
    expect(await readContacts(t.db, c.id, officer)).toEqual([]);
    expect((await staffTimeline(t.db, c.id, officer)).some((e) => e.type === "contact_viewed")).toBe(false);
  });

  it("without a key in production nothing is stored, not even the case", async () => {
    const env = { NODE_ENV: "production" };
    const [{ n: before }] = (await t.client.query<{ n: number }>("select count(*)::int as n from cases")).rows as [{ n: number }];
    await expect(
      createCase(t.db, { ...lost, contacts: [{ role: "reporter", email: "x@example.org" }] }, { kind: "public" }, { env }),
    ).rejects.toBeInstanceOf(PiiUnavailableError);
    const c = await createCase(t.db, lost, { kind: "public" });
    await expect(addContact(t.db, c.id, { role: "reporter", email: "x@example.org" }, { kind: "public" }, { env })).rejects.toBeInstanceOf(PiiUnavailableError);
    const [{ n: after }] = (await t.client.query<{ n: number }>("select count(*)::int as n from cases")).rows as [{ n: number }];
    expect(after).toBe(before + 1);
    expect((await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, c.id)))).toHaveLength(0);
  });

  it("rejects an empty contact", async () => {
    const c = await createCase(t.db, lost, { kind: "public" });
    await expect(addContact(t.db, c.id, { role: "reporter" }, { kind: "public" })).rejects.toMatchObject({ code: "invalid" });
  });

  it("rotates keys", async () => {
    const envA = { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_A };
    const envB = { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_B, PII_ENCRYPTION_KEY_PREVIOUS: KEY_A };
    const c = await createCase(t.db, { ...lost, contacts: [{ role: "owner", name: "Rotate Me", phone: "0899999999" }] }, { kind: "public" }, { env: envA });
    expect((await readContacts(t.db, c.id, officer, { env: envB }))[0]?.name).toBe("Rotate Me");
    expect(await reencryptContacts(t.db, { caseId: c.id, env: envB })).toBe(1);
    expect(await reencryptContacts(t.db, { caseId: c.id, env: envB })).toBe(0);
    const onlyB = { NODE_ENV: "production", PII_ENCRYPTION_KEY: KEY_B };
    expect((await readContacts(t.db, c.id, officer, { env: onlyB }))[0]?.phone).toBe("0899999999");
  });
});

describe("inbox", () => {
  it("lists only services the role may work, with filters", async () => {
    const lfCase = await createCase(t.db, { service: "lost_found", kind: "lost", summary: "inbox lf" }, { kind: "public" });
    const cpCase = await createCase(t.db, { service: "complaint", kind: "complaint", summary: "inbox cp" }, { kind: "public" });
    const lfList = await listCases(t.db, officer, { pageSize: 100 });
    expect(lfList.rows.some((r) => r.id === lfCase.id)).toBe(true);
    expect(lfList.rows.some((r) => r.id === cpCase.id)).toBe(false);
    const cpList = await listCases(t.db, complaintsHandler, { pageSize: 100 });
    expect(cpList.rows.every((r) => r.service === "complaint")).toBe(true);
    expect((await listCases(t.db, editor)).rows).toEqual([]);
    expect((await listCases(t.db, officer, { service: "complaint" })).rows).toEqual([]);

    const lead = await t.staff("Lead", "unit_lead");
    const all = await listCases(t.db, lead, { pageSize: 100 });
    expect(new Set(all.rows.map((r) => r.service))).toEqual(new Set(["lost_found", "complaint"]));
    await expect(getCase(t.db, cpCase.id, officer)).rejects.toMatchObject({ code: "forbidden" });
    await expect(staffTimeline(t.db, cpCase.id, officer)).rejects.toBeInstanceOf(CaseError);
  });

  it("filters by status, assignee and reference text", async () => {
    const c = await createCase(t.db, lost, { kind: "public" });
    await transition(t.db, c.id, "searching", officer);
    await assign(t.db, c.id, officer.userId, officer);
    const mine = await listCases(t.db, officer, { assignee: "me", status: "searching", pageSize: 100 });
    expect(mine.rows.map((r) => r.id)).toContain(c.id);
    expect(mine.rows[0]?.assigneeName).toBe("Officer");
    const unassigned = await listCases(t.db, otherOrgOfficer, { assignee: "unassigned", pageSize: 100 });
    expect(unassigned.rows.map((r) => r.id)).not.toContain(c.id);
    const byRef = await listCases(t.db, officer, { q: c.reference.toLowerCase() });
    expect(byRef.rows.map((r) => r.id)).toEqual([c.id]);
    expect((await listCases(t.db, officer, { q: "%" })).rows).toEqual([]);
    const paged = await listCases(t.db, officer, { pageSize: 2, page: 2 });
    expect(paged.rows).toHaveLength(2);
    expect(paged.total).toBeGreaterThan(4);
  });

  it("cases rows hold no contact data", async () => {
    const [row] = await t.db.select().from(cases).limit(1);
    expect(Object.keys(row!)).not.toEqual(expect.arrayContaining(["email", "name", "phone"]));
  });
});
