/** Redirecting a complaint to a faculty or a course: the state, the audit trail, the email and what the person sees. On PGlite with the real migrations. */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: () => undefined, isDatabaseConfigured: () => true }));

import { allowedTransitions, publicCaseView, transition, type StaffActor } from "@/lib/cases";
import { ComplaintError } from "@/lib/complaints/errors";
import { notifyRedirected } from "@/lib/complaints/notify";
import { openTracked } from "@/lib/complaints/public/track";
import { loadRedirectTarget } from "@/lib/complaints/redirect";
import { submitSurvey, surveyState } from "@/lib/complaints/survey";
import { acknowledgeComplaint, redirectComplaint, reopenComplaint, resolveComplaint } from "@/lib/complaints/workflow";
import { auditLog, caseEvents, cases, complaintCases, directoryOrganisations, faculties } from "@/lib/db/schema";
import { seedDirectory } from "@/lib/db/seed/directory";
import { seedFaculties } from "@/lib/db/seed/faculties";
import { MemoryEmailSender, type EmailSender } from "@/lib/email";
import { env, NOW, setupComplaints, type Ctx } from "./helpers";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let t: Ctx;
let h: StaffActor;
let liberalArts: string;
let law: string;
let basCommittee: string;
let lawCommittee: string;
beforeAll(async () => {
  t = await setupComplaints();
  h = t.handler;
  await seedFaculties(t.db);
  await seedDirectory(t.db);
  const facultyId = async (slug: string) => (await t.db.select().from(faculties).where(eq(faculties.slug, slug)))[0]!.id;
  const orgId = async (slug: string) => (await t.db.select().from(directoryOrganisations).where(eq(directoryOrganisations.slug, slug)))[0]!.id;
  liberalArts = await facultyId("liberal-arts");
  law = await facultyId("law");
  basCommittee = await orgId("british-and-american-studies");
  lawCommittee = await orgId("ll-b-student-committee");
});
const row = async (id: string) => (await t.db.select().from(cases).where(eq(cases.id, id)))[0]!;
const cc = async (id: string) => (await t.db.select().from(complaintCases).where(eq(complaintCases.caseId, id)))[0]!;

describe("redirectComplaint", () => {
  it("closes a faculty matter as redirected, stores where it went, and records the event and audit entry", async () => {
    const c = await t.file();
    const at = new Date(NOW.getTime() + 86_400_000);
    await redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: liberalArts, organisationId: basCommittee }, h, { now: at });

    const r = await row(c.caseId);
    expect(r.status).toBe("redirected");
    expect(r.closedAt).toEqual(at);
    expect(r.piiDeleteAfter!.getUTCFullYear()).toBe(at.getUTCFullYear() + 1);
    expect(await cc(c.caseId)).toMatchObject({ redirectLevel: "faculty", redirectFacultyId: liberalArts, redirectOrganisationId: basCommittee, redirectedAt: at });

    const events = await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId));
    const status = events.find((e) => e.type === "status_changed" && e.toStatus === "redirected")!;
    expect(status.visibility).toBe("public");
    const event = events.find((e) => e.type === "redirected")!;
    expect(event).toMatchObject({ visibility: "internal", actorUserId: h.userId, metadata: { level: "faculty", facultyId: liberalArts, organisationId: basCommittee } });

    const audit = await t.db.select().from(auditLog).where(and(eq(auditLog.entityId, c.caseId), eq(auditLog.action, "complaint.redirect")));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorUserId: h.userId, before: { status: "received" }, after: { status: "redirected", level: "faculty", facultyId: liberalArts, organisationId: basCommittee } });
    expect((await publicCaseView(t.db, c.caseId)).statusLabel.en).toBe("Redirected to the right people");
  });

  it("redirects a course matter to a faculty, with no programme association", async () => {
    const c = await t.file();
    await redirectComplaint(t.db, c.caseId, { level: "course", facultyId: law }, h, { now: NOW });
    expect(await cc(c.caseId)).toMatchObject({ redirectLevel: "course", redirectFacultyId: law, redirectOrganisationId: null });
    const c2 = await t.file();
    await expect(redirectComplaint(t.db, c2.caseId, { level: "course", facultyId: law, organisationId: lawCommittee }, h)).rejects.toMatchObject({ code: "invalid" });
    expect((await row(c2.caseId)).status).toBe("received");
  });

  it("works from an acknowledged complaint and refuses a resolved one", async () => {
    const c = await t.file();
    await acknowledgeComplaint(t.db, c.caseId, {}, h, { now: NOW });
    await redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: law }, h, { now: NOW });
    expect((await row(c.caseId)).status).toBe("redirected");

    const done = await t.file();
    await resolveComplaint(t.db, done.caseId, { outcome: { en: "Fixed" } }, h, { now: NOW });
    await expect(redirectComplaint(t.db, done.caseId, { level: "faculty", facultyId: law }, h)).rejects.toMatchObject({ code: "invalid_transition" });
    expect((await row(done.caseId)).status).toBe("resolved");
  });

  it("refuses an unknown faculty, an unpublished faculty and a committee from another faculty, changing nothing", async () => {
    const c = await t.file();
    await expect(redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: "00000000-0000-4000-8000-000000000000" }, h)).rejects.toBeInstanceOf(ComplaintError);
    await expect(redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: law, organisationId: basCommittee }, h)).rejects.toMatchObject({ code: "invalid" });
    await t.db.update(faculties).set({ status: "draft" }).where(eq(faculties.id, law));
    await expect(redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: law }, h)).rejects.toMatchObject({ code: "invalid" });
    await t.db.update(faculties).set({ status: "published" }).where(eq(faculties.id, law));
    await expect(redirectComplaint(t.db, c.caseId, { level: "elsewhere" as "faculty", facultyId: law }, h)).rejects.toMatchObject({ code: "invalid" });
    expect((await row(c.caseId)).status).toBe("received");
    expect((await cc(c.caseId)).redirectLevel).toBeNull();
  });

  it("keeps a restricted complaint out of reach of a handler who is not named", async () => {
    const c = await t.file({ key: "harassment" });
    await expect(redirectComplaint(t.db, c.caseId, { level: "course", facultyId: law }, h)).rejects.toMatchObject({ code: "not_found" });
    await redirectComplaint(t.db, c.caseId, { level: "course", facultyId: law }, t.named, { now: NOW });
    expect((await row(c.caseId)).status).toBe("redirected");
  });

  it("is final: nobody can reopen it into the queue, and no survey is asked", async () => {
    const c = await t.file();
    await redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: law }, h, { now: NOW });
    expect(allowedTransitions("complaint", "complaint", "redirected")).toEqual([]);
    expect(allowedTransitions("complaint", "complaint", "redirected", "public")).toEqual([]);
    await expect(reopenComplaint(t.db, c.caseId, {}, h)).rejects.toMatchObject({ code: "stale" });
    await expect(transition(t.db, c.caseId, "reopened", h)).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(transition(t.db, c.caseId, "in_progress", { kind: "public" })).rejects.toMatchObject({ code: "invalid_transition" });
    expect(await surveyState(t.db, c.caseId)).toBe("unavailable");
    expect(await submitSurvey(t.db, c.caseId, { score: 5 }, {}, { env })).toBe("not_open");
  });
});

describe("what the person sees", () => {
  it("shows the redirect, the association's Instagram and the faculty office on the tracking page", async () => {
    await t.db.update(faculties).set({ officePhone: "02 111 1111", officeNoteEn: "Weekdays 9 to 4" }).where(eq(faculties.id, liberalArts));
    const c = await t.file();
    await redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: liberalArts, organisationId: basCommittee }, h, { now: NOW });
    const view = await openTracked(t.db, c.reference, c.token, "1.1.1.1", NOW);
    expect(view.state).toBe("ok");
    if (view.state !== "ok") return;
    expect(view.complaint.view.status).toBe("redirected");
    expect(view.complaint).toMatchObject({ canWithdraw: false, canReopen: false, survey: "unavailable" });
    const target = view.complaint.redirect!;
    expect(target.level).toBe("faculty");
    expect(target.bodies.map((b) => b.name.en)).toEqual(["British and American Studies"]);
    expect(target.bodies[0]!.contacts).toEqual([expect.objectContaining({ channel: "instagram", value: "basthammasat" })]);
    expect(target.faculty!.office).toMatchObject({ phone: "02 111 1111", note: { en: "Weekdays 9 to 4" } });
  });

  it("falls back to the faculty-wide council when no programme is chosen, and to nothing for a course", async () => {
    const c = await t.file();
    await redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: liberalArts }, h, { now: NOW });
    expect((await loadRedirectTarget(t.db, c.caseId))!.bodies.map((b) => b.name.en)).toEqual(["Liberal Arts Student Council Tha Prachan"]);
    const course = await t.file();
    await redirectComplaint(t.db, course.caseId, { level: "course", facultyId: liberalArts }, h, { now: NOW });
    const target = (await loadRedirectTarget(t.db, course.caseId))!;
    expect(target).toMatchObject({ level: "course", bodies: [] });
    expect(target.faculty!.slug).toBe("liberal-arts");
    expect(await loadRedirectTarget(t.db, (await t.file()).caseId)).toBeNull();
  });
});

describe("notifyRedirected", () => {
  it("emails the complainant in both languages with the contacts, and logs the view", async () => {
    const c = await t.file();
    await redirectComplaint(t.db, c.caseId, { level: "faculty", facultyId: liberalArts, organisationId: basCommittee }, h, { now: NOW });
    const sender = new MemoryEmailSender();
    expect(await notifyRedirected(t.db, c.caseId, h, { sender, emailConfigured: true, env, now: NOW })).toEqual({ result: "sent" });
    expect(sender.outbox).toHaveLength(1);
    const mail = sender.outbox[0]!;
    expect(mail.to).toBe("somchai@example.com");
    expect(mail.subject).toContain(c.reference);
    expect(mail.text).toContain("outside our remit");
    expect(mail.text).toContain("นอกขอบเขต");
    expect(mail.text).toContain("Instagram: @basthammasat");
    expect(mail.text).toContain("Phone: 02 111 1111");
    expect(mail.text).not.toMatch(/tap|room 301/);
    const types = (await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, c.caseId))).map((e) => e.type);
    expect(types).toContain("contact_viewed");
  });

  it("says the lecturer has the final say for a course, and points to the faculty office", async () => {
    const c = await t.file();
    await redirectComplaint(t.db, c.caseId, { level: "course", facultyId: law }, h, { now: NOW });
    const sender = new MemoryEmailSender();
    await notifyRedirected(t.db, c.caseId, h, { sender, emailConfigured: true, env, now: NOW });
    const text = sender.outbox[0]!.text;
    expect(text).toContain("The lecturer has the final say");
    expect(text).toContain("If you cannot raise it with the lecturer, contact your faculty office.");
    expect(text).toContain("Faculty office: Faculty of Law");
    expect(text).toContain("We do not have this office's contact details yet");
    expect(text).not.toContain("Instagram");
  });

  it("sends nothing without consent, an address or email set up", async () => {
    const sender = new MemoryEmailSender();
    const anon = await t.file({ identity: "anonymous", contact: null });
    await redirectComplaint(t.db, anon.caseId, { level: "course", facultyId: law }, h, { now: NOW });
    expect(await notifyRedirected(t.db, anon.caseId, h, { sender, emailConfigured: true, env })).toEqual({ result: "remind", reason: "no_contact" });
    const quiet = await t.file({ contact: { role: "reporter", name: "Quiet", email: "quiet@example.com", preferredContact: "email", consentContact: false } });
    await redirectComplaint(t.db, quiet.caseId, { level: "course", facultyId: law }, h, { now: NOW });
    expect(await notifyRedirected(t.db, quiet.caseId, h, { sender, emailConfigured: true, env })).toEqual({ result: "remind", reason: "no_consent" });
    expect(await notifyRedirected(t.db, quiet.caseId, h, { sender, emailConfigured: false, env })).toEqual({ result: "remind", reason: "no_consent" });
    expect(sender.outbox).toHaveLength(0);
  });

  it("never throws when the email fails, and leaves the redirect in place", async () => {
    const c = await t.file();
    await redirectComplaint(t.db, c.caseId, { level: "course", facultyId: law }, h, { now: NOW });
    const failing: EmailSender = { send: async () => Promise.reject(new Error("provider down")) };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await notifyRedirected(t.db, c.caseId, h, { sender: failing, emailConfigured: true, env })).toEqual({ result: "remind", reason: "send_failed" });
    quiet.mockRestore();
    expect((await row(c.caseId)).status).toBe("redirected");
  });
});
