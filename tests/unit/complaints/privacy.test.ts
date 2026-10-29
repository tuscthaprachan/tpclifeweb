/** Anonymous submission, encryption of everything the person wrote, evidence, the survey and retention. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { readContacts, purgeExpiredPii } from "@/lib/cases";
import { caseAttachments, caseContacts, caseEvents, cases, complaintCases, complaintEvidence, complaintJourneyFiles, complaintJourneys, complaintSurveys, journeyMetrics } from "@/lib/db/schema";
import { hasContacts } from "@/lib/complaints/create";
import { readComplaintText, readEvidence } from "@/lib/complaints/details";
import { addJourneyFile, listJourneyFiles, removeJourneyFile } from "@/lib/complaints/public/evidence";
import { finishJourney, JourneyTooFastError, MIN_JOURNEY_MS } from "@/lib/complaints/public/journey";
import { loadJourney, startJourney, sweepExpiredJourneys, JOURNEY_TTL_MS } from "@/lib/complaints/public/store";
import { emptyValues } from "@/lib/complaints/public/validate";
import type { DraftValues } from "@/lib/complaints/public/steps";
import { JourneyInvalidError } from "@/lib/complaints/public/submit";
import { redactContactsForHandler } from "@/lib/complaints/redact";
import { parseScore, submitSurvey, surveyState } from "@/lib/complaints/survey";
import { resolveComplaint } from "@/lib/complaints/workflow";
import { MemoryStorage } from "@/lib/storage";
import { env, setupComplaints, NOW, type Ctx } from "./helpers";

let t: Ctx;
const ctx = { locale: "en" as const, ip: "203.0.113.9", userAgent: "vitest", requestId: "r1" };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

const values = (over: Partial<DraftValues> = {}): DraftValues => ({
  ...emptyValues(),
  emergency: "no",
  level: "university",
  identity: "named",
  category: "facilities",
  description: "Sensitive text about Khun Somsak in room 301",
  when: "Last Tuesday",
  where: "Room 301",
  remedy: "Apologise",
  name: "Somchai Tester",
  email: "somchai@example.com",
  preferred: "email",
  consent: "yes",
  ...over,
});

beforeAll(async () => {
  t = await setupComplaints();
});

async function rawDump() {
  const parts = await Promise.all([
    t.db.select().from(complaintCases),
    t.db.select().from(complaintEvidence),
    t.db.select().from(complaintSurveys),
    t.db.select().from(complaintJourneys),
    t.db.select().from(complaintJourneyFiles),
    t.db.select().from(caseContacts),
    t.db.select().from(caseEvents),
    t.db.select().from(cases),
  ]);
  return JSON.stringify(parts);
}

describe("submitting through the journey", () => {
  it("stores everything personal as ciphertext and nothing in the clear", async () => {
    const storage = new MemoryStorage();
    const { id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    const added = await addJourneyFile(t.db, id, { bytes: PNG, declaredType: "image/png", name: "C:\\fakepath\\Khun-Somsak-photo.png" }, { storage: () => storage, now: NOW, env });
    expect(added.ok).toBe(true);
    const journey = await loadJourney(t.db, undefined, { now: NOW, env });
    expect(journey).toBeNull();
    const [row] = await t.db.select().from(complaintJourneys).where(eq(complaintJourneys.id, id));
    expect(row!.dataEnc).toMatch(/^pii1\./);

    // Save the answers, then wait out the minimum time and finish.
    const { saveJourney: save } = await import("@/lib/complaints/public/store");
    const data = { v: 1 as const, locale: "en" as const, startedAt: NOW.toISOString(), values: values() };
    await save(t.db, id, data, { now: NOW, env });
    await expect(finishJourney(t.db, id, ctx, { now: new Date(NOW.getTime() + 1000), env })).rejects.toBeInstanceOf(JourneyTooFastError);
    const later = new Date(NOW.getTime() + MIN_JOURNEY_MS + 1);
    const result = await finishJourney(t.db, id, ctx, { now: later, env });
    expect(result.reference).toMatch(/^CP-\d{4}-\d{4}$/);
    expect(result.token).toHaveLength(43);
    // The completion count has the start and the finish, and nothing about the person.
    const [metric] = await t.db.select().from(journeyMetrics).where(eq(journeyMetrics.id, id));
    expect(metric).toMatchObject({ kind: "complaint", startedAt: NOW, finishedAt: later });
    // A second press returns the same complaint.
    expect(await finishJourney(t.db, id, ctx, { now: later, env })).toEqual(result);

    const dump = await rawDump();
    for (const secret of ["Khun Somsak", "room 301", "Last Tuesday", "Apologise", "Somchai", "somchai@example.com", "fakepath", "photo.png"]) {
      expect(dump, secret).not.toContain(secret);
    }
    // The journey's answers are cleared once sent, and its files belong to the complaint.
    expect(await listJourneyFiles(t.db, id, { env })).toEqual([]);

    const [c] = await t.db.select().from(cases).where(eq(cases.reference, result.reference));
    const text = await readComplaintText(t.db, c!.id, t.handler, { env });
    expect(text).toMatchObject({ description: "Sensitive text about Khun Somsak in room 301", when: "Last Tuesday", where: "Room 301", remedy: "Apologise" });
    const files = await readEvidence(t.db, c!.id, t.handler, () => storage, { env });
    expect(files).toHaveLength(1);
    expect(files[0]!.name).toBe("Khun-Somsak-photo.png");
    expect(files[0]!.url).toMatch(/^memory:/);
    const att = await t.db.select().from(caseAttachments).where(eq(caseAttachments.caseId, c!.id));
    expect(att[0]!.storageKey).toMatch(/^cp\/evidence\/[0-9a-f-]+\.png$/);
  });

  it("an anonymous complaint holds no contact at all and is reachable only by its link", async () => {
    const { id } = await startJourney(t.db, { locale: "th" }, { now: NOW, env });
    const { saveJourney: save } = await import("@/lib/complaints/public/store");
    await save(t.db, id, { v: 1, locale: "th", startedAt: NOW.toISOString(), values: values({ identity: "anonymous", name: "", email: "", consent: "", description: "ไม่ระบุตัวตน" }) }, { now: NOW, env });
    const result = await finishJourney(t.db, id, { ...ctx, locale: "th" }, { now: new Date(NOW.getTime() + 5000), env });
    expect(result.email).toBeNull();
    const [c] = await t.db.select().from(cases).where(eq(cases.reference, result.reference));
    expect(await hasContacts(t.db, c!.id)).toBe(false);
    expect((await t.db.select().from(complaintCases).where(eq(complaintCases.caseId, c!.id)))[0]!.identity).toBe("anonymous");
    expect(await readContacts(t.db, c!.id, t.handler, { env })).toEqual([]);
    const { openTracked } = await import("@/lib/complaints/public/track");
    const tracked = await openTracked(t.db, result.reference, result.token, "9.9.9.9", NOW);
    expect(tracked.state).toBe("ok");
    expect((await openTracked(t.db, result.reference, "z".repeat(43), "9.9.9.9", NOW)).state).toBe("none");
  });

  it("refuses answers that do not validate, writing nothing", async () => {
    const before = (await t.db.select().from(cases)).length;
    const { id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    const { saveJourney: save } = await import("@/lib/complaints/public/store");
    await save(t.db, id, { v: 1, locale: "en", startedAt: NOW.toISOString(), values: values({ description: "", category: "nope" }) }, { now: NOW, env });
    await expect(finishJourney(t.db, id, ctx, { now: new Date(NOW.getTime() + 5000), env })).rejects.toBeInstanceOf(JourneyInvalidError);
    expect((await t.db.select().from(journeyMetrics).where(eq(journeyMetrics.id, id)))[0]!.finishedAt).toBeNull();
    expect((await t.db.select().from(cases)).length).toBe(before);
  });

  it("a pseudonymous complainant's name is hidden from ordinary handlers but not from a lead", async () => {
    const c = await t.file({ identity: "pseudonymous", contact: { role: "reporter", name: "Real Name", email: "p@example.com", preferredContact: "email", consentContact: true } });
    const contacts = await readContacts(t.db, c.caseId, t.handler, { env });
    expect(contacts[0]!.name).toBe("Real Name");
    expect((await redactContactsForHandler(t.db, c.caseId, t.handler.roles, contacts))[0]!.name).toBeNull();
    expect((await redactContactsForHandler(t.db, c.caseId, t.lead.roles, contacts))[0]!.name).toBe("Real Name");
  });
});

describe("evidence", () => {
  it("rejects wrong types, empty and too many files, and removes a file from storage", async () => {
    const storage = new MemoryStorage();
    const { id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    const add = (bytes: Uint8Array, type?: string) => addJourneyFile(t.db, id, { bytes, declaredType: type, name: "a.png" }, { storage: () => storage, now: NOW, env });
    expect(await add(new Uint8Array(), "image/png")).toEqual({ ok: false, reason: "empty" });
    expect(await add(new TextEncoder().encode("<script>"), "image/png")).toEqual({ ok: false, reason: "unsupported_type" });
    expect(await add(PNG, "application/pdf")).toEqual({ ok: false, reason: "type_mismatch" });
    expect(await add(new Uint8Array(4 * 1024 * 1024 + 1).fill(1), "image/png")).toEqual({ ok: false, reason: "too_large" });
    const first = await add(PNG, "image/png");
    expect(first.ok).toBe(true);
    await add(PNG); await add(PNG);
    expect(await add(PNG)).toEqual({ ok: false, reason: "too_many" });
    expect((await listJourneyFiles(t.db, id, { env })).length).toBe(3);
    if (first.ok) expect(await removeJourneyFile(t.db, id, first.id, () => storage)).toBe(true);
    expect((await listJourneyFiles(t.db, id, { env })).length).toBe(2);
  });

  it("says so and stores nothing when file storage is not configured", async () => {
    const { id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    const out = await addJourneyFile(t.db, id, { bytes: PNG, declaredType: "image/png" }, { storage: () => { throw new Error("not configured"); }, now: NOW, env });
    expect(out).toEqual({ ok: false, reason: "not_configured" });
    expect(await listJourneyFiles(t.db, id, { env })).toEqual([]);
  });

  it("an abandoned journey is swept with its files", async () => {
    const storage = new MemoryStorage();
    const { id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    await addJourneyFile(t.db, id, { bytes: PNG, declaredType: "image/png" }, { storage: () => storage, now: NOW, env });
    const [file] = await t.db.select().from(complaintJourneyFiles).where(eq(complaintJourneyFiles.journeyId, id));
    expect(await sweepExpiredJourneys(t.db, new Date(NOW.getTime() + 60_000), () => storage)).toBe(0);
    expect(await sweepExpiredJourneys(t.db, new Date(NOW.getTime() + JOURNEY_TTL_MS + 1), () => storage)).toBeGreaterThanOrEqual(1);
    expect(await storage.get(file!.storageKey)).toBeNull();
    expect(await t.db.select().from(complaintJourneyFiles).where(eq(complaintJourneyFiles.journeyId, id))).toEqual([]);
  });
});

describe("satisfaction survey", () => {
  it("opens after a resolution, takes 1 to 5 once per resolution, and encrypts the comment", async () => {
    const c = await t.file();
    expect(await surveyState(t.db, c.caseId)).toBe("unavailable");
    expect(await submitSurvey(t.db, c.caseId, { score: 5 }, {}, { now: NOW, env })).toBe("not_open");
    await resolveComplaint(t.db, c.caseId, { outcome: { en: "Done" } }, t.handler, { now: NOW });
    expect(await surveyState(t.db, c.caseId)).toBe("open");
    expect(await submitSurvey(t.db, c.caseId, { score: 0 }, {}, { now: NOW, env })).toBe("invalid");
    expect(await submitSurvey(t.db, c.caseId, { score: 6 }, {}, { now: NOW, env })).toBe("invalid");
    expect(await submitSurvey(t.db, c.caseId, { score: 4, comment: "Slow but fair, thanks Khun Mali" }, {}, { now: NOW, env })).toBe("saved");
    expect(await submitSurvey(t.db, c.caseId, { score: 1 }, {}, { now: NOW, env })).toBe("already");
    expect(await surveyState(t.db, c.caseId)).toBe("answered");
    const [s] = await t.db.select().from(complaintSurveys).where(eq(complaintSurveys.caseId, c.caseId));
    expect(s!.score).toBe(4);
    expect(s!.commentEnc).toMatch(/^pii1\./);
    expect(JSON.stringify(s)).not.toContain("Khun Mali");
    expect(parseScore("3")).toBe(3);
    expect(parseScore("x")).toBeNull();
  });
});

describe("retention", () => {
  it("deletes the text, evidence, names and comments a year after closure but keeps scores and dates", async () => {
    const storage = new MemoryStorage();
    const { id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    await addJourneyFile(t.db, id, { bytes: PNG, declaredType: "image/png", name: "evidence.png" }, { storage: () => storage, now: NOW, env });
    const { saveJourney: save } = await import("@/lib/complaints/public/store");
    await save(t.db, id, { v: 1, locale: "en", startedAt: NOW.toISOString(), values: values() }, { now: NOW, env });
    const result = await finishJourney(t.db, id, ctx, { now: new Date(NOW.getTime() + 5000), env });
    const [c] = await t.db.select().from(cases).where(eq(cases.reference, result.reference));
    await resolveComplaint(t.db, c!.id, { outcome: { en: "Done" } }, t.handler, { now: NOW });
    await submitSurvey(t.db, c!.id, { score: 3, comment: "okay" }, {}, { now: NOW, env });

    const year = new Date(NOW.getTime() + 366 * 86_400_000);
    const purged = await purgeExpiredPii(t.db, year, () => storage);
    expect(purged.failed).toBe(0);
    expect(purged.purged).toBeGreaterThanOrEqual(1);

    const [cc] = await t.db.select().from(complaintCases).where(eq(complaintCases.caseId, c!.id));
    expect([cc!.descriptionEnc, cc!.whenEnc, cc!.whereEnc, cc!.remedyEnc, cc!.reopenReasonEnc]).toEqual([null, null, null, null, null]);
    expect(cc!.resolvedAt).not.toBeNull();
    expect(await t.db.select().from(complaintEvidence).where(eq(complaintEvidence.caseId, c!.id))).toEqual([]);
    expect(await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, c!.id))).toEqual([]);
    const [s] = await t.db.select().from(complaintSurveys).where(eq(complaintSurveys.caseId, c!.id));
    expect(s!.score).toBe(3);
    expect(s!.commentEnc).toBeNull();
    expect(await readComplaintText(t.db, c!.id, t.handler, { env })).toBeNull();
    const files = await t.db.select({ n: sql<number>`count(*)::int` }).from(caseAttachments).where(eq(caseAttachments.caseId, c!.id));
    expect(files[0]!.n).toBe(0);
  });
});
