/**
 * The public lost and found journeys against a real Postgres (PGlite) with
 * the real migrations: submit a lost report, a found report and a claim, then
 * track and withdraw. Personal data must be encrypted everywhere it lands and
 * the public listing must stay a draft with no private column written.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { publicCaseView, readContacts, resolveTrackingLink, transition, createCase, type StaffActor } from "@/lib/cases";
import { decryptPii, PiiUnavailableError } from "@/lib/crypto/pii";
import { auditLog, caseContacts, caseEvents, cases, lostFoundClaims, lostFoundIdentifyingDetails, lostFoundItems, lostFoundJourneys, lostFoundPublic, places, referenceCounters } from "@/lib/db/schema";
import { claimAnswerAad, identifyingDetailAad } from "@/lib/lost-found/public/aad";
import { trackingLinkEmail } from "@/lib/lost-found/public/email";
import { finishJourney, JourneyTooFastError, MIN_JOURNEY_MS } from "@/lib/lost-found/public/journey";
import { deleteJourney, JOURNEY_TTL_MS, loadJourney, saveJourney, startJourney, sweepExpiredJourneys } from "@/lib/lost-found/public/store";
import { ClaimUnavailableError, findClaimTarget, JourneyInvalidError, submitClaim, submitReport } from "@/lib/lost-found/public/submit";
import { openTracked, withdrawTracked } from "@/lib/lost-found/public/track";
import { emptyValues } from "@/lib/lost-found/public/validate";
import type { DraftValues } from "@/lib/lost-found/public/steps";
import { KEY_A, KEY_B, setup } from "../cases/helpers";

let t: Awaited<ReturnType<typeof setup>>;
let officer: StaffActor;
const env = { PII_ENCRYPTION_KEY: KEY_A, NODE_ENV: "test" };
const NOW = new Date("2026-03-10T05:00:00Z");
const ctx = { locale: "en" as const, ip: "203.0.113.7", userAgent: "vitest", requestId: "req-1" };
let placeId: string;

const lostValues = (over: Partial<DraftValues> = {}): DraftValues => ({
  ...emptyValues(),
  category: "umbrella",
  title: "Blue umbrella",
  description: "Folding, blue, a bent rib",
  locationNote: "Near the library steps",
  day: "2",
  month: "3",
  year: "2026",
  detail: "Initials ST in marker on the handle",
  name: "Somchai Tanaka",
  email: "somchai@example.com",
  phone: "0812345678",
  preferred: "email",
  consent: "yes",
  ...over,
});

const foundValues = (over: Partial<DraftValues> = {}): DraftValues => ({
  ...lostValues(),
  category: "wallet",
  title: "Black wallet",
  description: "Leather, black",
  detail: "",
  whereNow: "will_hand_in",
  ...over,
});

beforeAll(async () => {
  t = await setup();
  officer = await t.staff("Desk officer", "lf_officer", "tusu");
  const [place] = await t.db.insert(places).values({ slug: "library", nameEn: "Library", category: "welfare" }).returning();
  placeId = place!.id;
}, 60_000);

async function counter() {
  const [row] = await t.db.select().from(referenceCounters).where(eq(referenceCounters.prefix, "LF"));
  return row?.lastValue ?? 0;
}

describe("journey store", () => {
  it("keeps answers encrypted, finds them by token, and ignores other kinds and tampering", async () => {
    const { token, id } = await startJourney(t.db, { kind: "lost", locale: "th" }, { now: NOW, env });
    const loaded = await loadJourney(t.db, token, "lost", { now: NOW, env });
    expect(loaded?.id).toBe(id);
    loaded!.data.values.name = "Secret Name";
    await saveJourney(t.db, id, loaded!.data, { now: NOW, env });
    const [row] = await t.db.select().from(lostFoundJourneys).where(eq(lostFoundJourneys.id, id));
    expect(row!.dataEnc.startsWith("pii1.")).toBe(true);
    expect(row!.dataEnc).not.toContain("Secret");
    expect(row!.tokenHash).not.toBe(token);
    expect((await loadJourney(t.db, token, "lost", { now: NOW, env }))?.data.values.name).toBe("Secret Name");
    expect(await loadJourney(t.db, token, "found", { now: NOW, env })).toBeNull();
    expect(await loadJourney(t.db, "x".repeat(43), "lost", { now: NOW, env })).toBeNull();
    expect(await loadJourney(t.db, undefined, "lost", { now: NOW, env })).toBeNull();
    // Another key cannot read it: treated as gone, not as a crash.
    expect(await loadJourney(t.db, token, "lost", { now: NOW, env: { PII_ENCRYPTION_KEY: KEY_B, NODE_ENV: "test" } })).toBeNull();
    await deleteJourney(t.db, id);
    expect(await loadJourney(t.db, token, "lost", { now: NOW, env })).toBeNull();
  });

  it("expires after two hours and the sweep removes old rows when a new journey starts", async () => {
    const old = await startJourney(t.db, { kind: "found", locale: "en" }, { now: NOW, env });
    const later = new Date(NOW.getTime() + JOURNEY_TTL_MS + 1000);
    expect(await loadJourney(t.db, old.token, "found", { now: later, env })).toBeNull();
    await startJourney(t.db, { kind: "found", locale: "en" }, { now: later, env });
    expect(await t.db.select().from(lostFoundJourneys).where(eq(lostFoundJourneys.id, old.id))).toHaveLength(0);
    expect(await sweepExpiredJourneys(t.db, later)).toBe(0);
  });

  it("refuses to store anything without an encryption key", async () => {
    await expect(startJourney(t.db, { kind: "lost", locale: "en" }, { now: NOW, env: { NODE_ENV: "production" } })).rejects.toBeInstanceOf(PiiUnavailableError);
  });
});

describe("lost report", () => {
  let reference: string;
  let caseId: string;
  let token: string;

  it("creates the case, the encrypted contact, a linked draft listing and a tracking link", async () => {
    const out = await submitReport(t.db, "lost", lostValues({ placeId }), ctx, { now: NOW, env });
    ({ reference, caseId, token } = out);
    expect(reference).toBe("LF-2026-0001");

    const [c] = await t.db.select().from(cases).where(eq(cases.id, caseId));
    expect(c).toMatchObject({ service: "lost_found", kind: "lost", status: "submitted", subtype: "umbrella", locale: "en", summary: "Lost: Umbrella" });

    const [item] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.reference, reference));
    expect(item).toMatchObject({
      caseId,
      status: "draft",
      slug: "lf-2026-0001",
      kind: "lost",
      registerStatus: "open",
      submittedByStudent: true,
      category: "umbrella",
      titleEn: "Blue umbrella",
      titleTh: "",
      descriptionEn: "Folding, blue, a bent rib",
      locationNoteEn: "Near the library steps",
      placeId,
      occurredOn: "2026-03-02",
    });
    // The legacy plaintext columns are never written, and the draft is not public.
    expect(item!.submitterContact).toBeNull();
    expect(item!.staffVerificationDetail).toBeNull();
    expect(item!.publishedAt).toBeNull();
    expect(await t.db.select().from(lostFoundPublic).where(eq(lostFoundPublic.reference, reference))).toHaveLength(0);
  });

  it("encrypts the contact, readable only through the logged staff read", async () => {
    const raw = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, caseId));
    expect(raw).toHaveLength(1);
    expect(raw[0]).toMatchObject({ role: "reporter", preferredContact: "email", consentContact: true });
    expect(JSON.stringify(raw)).not.toContain("somchai");
    expect(JSON.stringify(raw)).not.toContain("Tanaka");
    expect(raw[0]!.nameEnc!.startsWith("pii1.")).toBe(true);
    const contacts = await readContacts(t.db, caseId, officer, { env });
    expect(contacts[0]).toMatchObject({ name: "Somchai Tanaka", email: "somchai@example.com", phone: "0812345678", lineId: null });
  });

  it("keeps the identifying detail encrypted, attached to the reporter, and out of the listing and audit", async () => {
    const [d] = await t.db.select().from(lostFoundIdentifyingDetails).where(eq(lostFoundIdentifyingDetails.caseId, caseId));
    expect(d!.detailEnc).not.toContain("Initials");
    expect(decryptPii(d!.detailEnc, identifyingDetailAad(d!.id), env)).toBe("Initials ST in marker on the handle");
    const [reporter] = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, caseId));
    expect(d!.contactId).toBe(reporter!.id);
    const everything = JSON.stringify([await t.db.select().from(lostFoundItems), await t.db.select().from(auditLog), await t.db.select().from(caseEvents)]);
    expect(everything).not.toContain("Initials");
    expect(everything).not.toContain("somchai@example.com");
    expect(everything).not.toContain("0812345678");
  });

  it("deletes the identifying detail with the contact, as retention does", async () => {
    const out = await submitReport(t.db, "lost", lostValues({ placeId: "" }), ctx, { now: NOW, env });
    expect(await t.db.select().from(lostFoundIdentifyingDetails).where(eq(lostFoundIdentifyingDetails.caseId, out.caseId))).toHaveLength(1);
    await t.db.delete(caseContacts).where(eq(caseContacts.caseId, out.caseId));
    expect(await t.db.select().from(lostFoundIdentifyingDetails).where(eq(lostFoundIdentifyingDetails.caseId, out.caseId))).toHaveLength(0);
  });

  it("issues a tracking link that works with the reference, and shows only public information", async () => {
    expect(token).toHaveLength(43);
    expect(await resolveTrackingLink(t.db, reference, token, NOW)).toMatchObject({ id: caseId, kind: "lost" });
    expect(await resolveTrackingLink(t.db, reference, "b".repeat(43), NOW)).toBeNull();
    expect(await resolveTrackingLink(t.db, "LF-2026-0099", token, NOW)).toBeNull();
    const view = await publicCaseView(t.db, caseId);
    expect(view).toMatchObject({ reference, status: "submitted", statusLabel: { en: "Received" } });
    expect(view.timeline.map((e) => e.type)).toEqual(["created"]);
    expect(JSON.stringify(view)).not.toContain("Initials");
  });

  it("records the audit entry without personal data", async () => {
    const rows = await t.db.select().from(auditLog).where(eq(auditLog.action, "lost_found_item.report"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toMatchObject({ actorUserId: null, requestId: "req-1", entityType: "lost_found_item" });
    expect(rows[0]!.after).toMatchObject({ reference, kind: "lost", category: "umbrella", status: "draft", caseId });
  });

  it("writes Thai text to the Thai column", async () => {
    const out = await submitReport(t.db, "lost", lostValues({ title: "ร่มสีฟ้า", description: "ร่มพับ", locationNote: "หน้าห้องสมุด" }), { ...ctx, locale: "th" }, { now: NOW, env });
    const [item] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.reference, out.reference));
    expect(item).toMatchObject({ titleTh: "ร่มสีฟ้า", titleEn: "", descriptionTh: "ร่มพับ", locationNoteTh: "หน้าห้องสมุด", locationNoteEn: "" });
    const [c] = await t.db.select().from(cases).where(eq(cases.id, out.caseId));
    expect(c!.locale).toBe("th");
  });

  it("refuses invalid answers and leaves nothing behind", async () => {
    const before = await counter();
    const items = (await t.db.select().from(lostFoundItems)).length;
    await expect(submitReport(t.db, "lost", lostValues({ title: "" }), ctx, { now: NOW, env })).rejects.toMatchObject({ step: "describe", errors: { title: "lfpErrTitle" } });
    await expect(submitReport(t.db, "lost", lostValues({ consent: "" }), ctx, { now: NOW, env })).rejects.toBeInstanceOf(JourneyInvalidError);
    expect(await counter()).toBe(before);
    expect(await t.db.select().from(lostFoundItems)).toHaveLength(items);
  });

  it("rolls everything back, giving the reference back, when a place does not exist", async () => {
    const before = await counter();
    const items = (await t.db.select().from(lostFoundItems)).length;
    const cs = (await t.db.select().from(cases)).length;
    await expect(submitReport(t.db, "lost", lostValues({ placeId: "00000000-0000-4000-8000-000000000000" }), ctx, { now: NOW, env })).rejects.toThrow();
    expect(await counter()).toBe(before);
    expect(await t.db.select().from(lostFoundItems)).toHaveLength(items);
    expect(await t.db.select().from(cases)).toHaveLength(cs);
  });

  it("stores no plaintext when there is no key", async () => {
    const cs = (await t.db.select().from(cases)).length;
    await expect(submitReport(t.db, "lost", lostValues(), ctx, { now: NOW, env: { NODE_ENV: "production" } })).rejects.toBeInstanceOf(PiiUnavailableError);
    expect(await t.db.select().from(cases)).toHaveLength(cs);
  });
});

describe("found report", () => {
  it("creates a logged case and a draft found listing, with an internal note about where the item is", async () => {
    const out = await submitReport(t.db, "found", foundValues(), ctx, { now: NOW, env });
    const [c] = await t.db.select().from(cases).where(eq(cases.id, out.caseId));
    expect(c).toMatchObject({ kind: "found", status: "logged", summary: "Found: Wallet or purse" });
    const [item] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.caseId, out.caseId));
    expect(item).toMatchObject({ kind: "found", status: "draft", titleEn: "Black wallet", reference: out.reference });
    const events = await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, out.caseId));
    const note = events.find((e) => e.type === "internal_note");
    expect(note).toMatchObject({ visibility: "internal" });
    expect(note!.body).toContain("take it to the TUSU or TUSC desk");
    const [contact] = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, out.caseId));
    expect(contact!.role).toBe("finder");
    expect(await t.db.select().from(lostFoundIdentifyingDetails).where(eq(lostFoundIdentifyingDetails.caseId, out.caseId))).toHaveLength(0);
  });

  it("works with no contact details at all", async () => {
    const out = await submitReport(t.db, "found", foundValues({ name: "", email: "", phone: "", consent: "", preferred: "" }), ctx, { now: NOW, env });
    expect(await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, out.caseId))).toHaveLength(0);
    expect(await resolveTrackingLink(t.db, out.reference, out.token, NOW)).toMatchObject({ kind: "found" });
  });

  it("asks for contact details when the finder wants staff to ring them", async () => {
    await expect(submitReport(t.db, "found", foundValues({ whereNow: "need_help", name: "", email: "", phone: "", consent: "" }), ctx, { now: NOW, env })).rejects.toMatchObject({ step: "contact" });
  });
});

describe("finishing a journey", () => {
  async function filled(kind: "lost" | "found", values: DraftValues, startedAt: Date) {
    const { token, id } = await startJourney(t.db, { kind, locale: "en" }, { now: startedAt, env });
    const loaded = await loadJourney(t.db, token, kind, { now: startedAt, env });
    await saveJourney(t.db, id, { ...loaded!.data, values }, { now: startedAt, env });
    return id;
  }

  it("submits once and hands back the same result on a second call", async () => {
    const id = await filled("lost", lostValues(), new Date(NOW.getTime() - 60_000));
    const before = await counter();
    const first = await finishJourney(t.db, id, ctx, { now: NOW, env });
    const again = await finishJourney(t.db, id, ctx, { now: NOW, env });
    expect(again).toEqual(first);
    expect(await counter()).toBe(before + 1);
    expect(first).toMatchObject({ email: "somchai@example.com", emailed: false });
    const [row] = await t.db.select().from(lostFoundJourneys).where(eq(lostFoundJourneys.id, id));
    // The answers are gone; only the result remains, and it expires in minutes.
    const text = decryptPii(row!.dataEnc, `lost_found_journeys:data:${id}`, env);
    expect(JSON.parse(text).values.name).toBe("");
    expect(row!.expiresAt.getTime()).toBeLessThanOrEqual(NOW.getTime() + 30 * 60 * 1000);
  });

  it("refuses a submission that came faster than a person could fill it in", async () => {
    const id = await filled("lost", lostValues(), new Date(NOW.getTime() - (MIN_JOURNEY_MS - 500)));
    const before = await counter();
    await expect(finishJourney(t.db, id, ctx, { now: NOW, env })).rejects.toBeInstanceOf(JourneyTooFastError);
    expect(await counter()).toBe(before);
  });

  it("does not leave a result if the submission fails", async () => {
    const id = await filled("found", foundValues({ placeId: "00000000-0000-4000-8000-000000000000" }), new Date(NOW.getTime() - 60_000));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(finishJourney(t.db, id, ctx, { now: NOW, env })).rejects.toThrow();
    spy.mockRestore();
    const [row] = await t.db.select().from(lostFoundJourneys).where(eq(lostFoundJourneys.id, id));
    expect(JSON.parse(decryptPii(row!.dataEnc, `lost_found_journeys:data:${id}`, env)).result).toBeUndefined();
  });
});

describe("tracking and withdrawing", () => {
  it("shows the public view for the right reference and link, and the same nothing for any failure", async () => {
    const out = await submitReport(t.db, "lost", lostValues(), ctx, { now: NOW, env });
    const ok = await openTracked(t.db, out.reference, out.token, "198.51.100.1", NOW);
    expect(ok).toMatchObject({ state: "ok", canWithdraw: true });
    expect(await openTracked(t.db, out.reference, "c".repeat(43), "198.51.100.1", NOW)).toEqual({ state: "none" });
    expect(await openTracked(t.db, "LF-2026-0999", out.token, "198.51.100.1", NOW)).toEqual({ state: "none" });
    expect(await openTracked(t.db, out.reference, "short", "198.51.100.1", NOW)).toEqual({ state: "none" });
  });

  it("limits attempts per address", async () => {
    const out = await submitReport(t.db, "lost", lostValues(), ctx, { now: NOW, env });
    let last = await openTracked(t.db, out.reference, "d".repeat(43), "198.51.100.99", NOW);
    for (let i = 0; i < 25; i++) last = await openTracked(t.db, out.reference, "d".repeat(43), "198.51.100.99", NOW);
    expect(last.state).toBe("limited");
    // Another address is not affected.
    expect((await openTracked(t.db, out.reference, out.token, "198.51.100.100", NOW)).state).toBe("ok");
  });

  it("withdraws a lost report, closes the case with the one year clock, and takes the listing off the register", async () => {
    const out = await submitReport(t.db, "lost", lostValues(), ctx, { now: NOW, env });
    expect(await withdrawTracked(t.db, out.reference, "e".repeat(43), { ip: "198.51.100.2" }, NOW)).toBe("none");
    expect(await withdrawTracked(t.db, out.reference, out.token, { ip: "198.51.100.2", requestId: "r" }, NOW)).toBe("withdrawn");
    const [c] = await t.db.select().from(cases).where(eq(cases.id, out.caseId));
    expect(c).toMatchObject({ status: "withdrawn" });
    expect(c!.closedAt).toEqual(NOW);
    expect(c!.piiDeleteAfter).toEqual(new Date("2027-03-10T05:00:00Z"));
    const [item] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.caseId, out.caseId));
    expect(item!.registerStatus).toBe("withdrawn");
    const view = await openTracked(t.db, out.reference, out.token, "198.51.100.3", NOW);
    expect(view).toMatchObject({ state: "ok", canWithdraw: false, view: { status: "withdrawn" } });
    // Withdrawing twice, or after the case is closed, is not allowed.
    expect(await withdrawTracked(t.db, out.reference, out.token, { ip: "198.51.100.2" }, NOW)).toBe("not_allowed");
  });

  it("does not offer withdrawal on a found item case", async () => {
    const out = await submitReport(t.db, "found", foundValues(), ctx, { now: NOW, env });
    expect(await openTracked(t.db, out.reference, out.token, "198.51.100.4", NOW)).toMatchObject({ state: "ok", canWithdraw: false });
    expect(await withdrawTracked(t.db, out.reference, out.token, { ip: "198.51.100.4" }, NOW)).toBe("not_allowed");
  });
});

describe("claim", () => {
  async function publishedFound(over: { status?: "logged" | "listed" | "ready_to_collect"; published?: boolean; withCase?: boolean } = {}) {
    const made = over.withCase === false ? null : await createCase(t.db, { service: "lost_found", kind: "found", summary: "Found: Wallet" }, officer, { now: NOW });
    if (made && over.status && over.status !== "logged") {
      if (over.status === "ready_to_collect") {
        await transition(t.db, made.id, "claim_pending", officer, { now: NOW });
        await transition(t.db, made.id, "ready_to_collect", officer, { now: NOW });
      } else {
        await transition(t.db, made.id, over.status, officer, { now: NOW });
      }
    }
    const reference = made?.reference ?? `LF-2026-9${Math.floor(Math.random() * 900 + 100)}`;
    await t.db.insert(lostFoundItems).values({
      reference,
      slug: reference.toLowerCase(),
      kind: "found",
      titleEn: "Black wallet",
      category: "wallet",
      occurredOn: "2026-03-01",
      owner: "tusu",
      status: over.published === false ? "draft" : "published",
      publishedAt: NOW,
      caseId: made?.id ?? null,
    });
    return { slug: reference.toLowerCase(), reference, caseId: made?.id };
  }

  const claimValues = (over: Partial<DraftValues> = {}) => ({
    ...emptyValues(),
    proof: "There is a green library card behind the ID window",
    name: "Nok Claimant",
    email: "nok@example.com",
    consent: "yes",
    ...over,
  });

  it("adds the claimant, stores the answer encrypted, moves the case to claim pending and issues a link", async () => {
    const item = await publishedFound({ status: "listed" });
    const out = await submitClaim(t.db, item.slug, claimValues(), ctx, { now: NOW, env });
    expect(out).toMatchObject({ reference: item.reference, caseId: item.caseId });

    const contacts = await readContacts(t.db, item.caseId!, officer, { env });
    expect(contacts.find((c) => c.role === "claimant")).toMatchObject({ name: "Nok Claimant", email: "nok@example.com", consentContact: true });

    const [claim] = await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.caseId, item.caseId!));
    expect(claim!.answerEnc).not.toContain("green library");
    expect(decryptPii(claim!.answerEnc!, claimAnswerAad(claim!.id), env)).toContain("green library card");
    expect(claim!.decision).toBeNull();
    const [claimant] = await t.db.select().from(caseContacts).where(eq(caseContacts.id, claim!.claimantContactId!));
    expect(claimant!.role).toBe("claimant");

    const [c] = await t.db.select().from(cases).where(eq(cases.id, item.caseId!));
    expect(c!.status).toBe("claim_pending");
    const events = await t.db.select().from(caseEvents).where(eq(caseEvents.caseId, item.caseId!));
    expect(events.find((e) => e.type === "status_changed" && e.toStatus === "claim_pending")).toMatchObject({ fromStatus: "listed", visibility: "public" });
    expect(JSON.stringify(events)).not.toContain("green library");
    expect(JSON.stringify(await t.db.select().from(auditLog))).not.toContain("green library");

    expect(await resolveTrackingLink(t.db, item.reference, out.token, NOW)).toMatchObject({ id: item.caseId });
  });

  it("moves a logged item too, and a second claim keeps it pending", async () => {
    const item = await publishedFound({ status: "logged" });
    await submitClaim(t.db, item.slug, claimValues(), ctx, { now: NOW, env });
    await submitClaim(t.db, item.slug, claimValues({ name: "Second Person" }), ctx, { now: NOW, env });
    const [c] = await t.db.select().from(cases).where(eq(cases.id, item.caseId!));
    expect(c!.status).toBe("claim_pending");
    expect(await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.caseId, item.caseId!))).toHaveLength(2);
  });

  it("records the claim but leaves an item that is ready to collect for someone else alone", async () => {
    const item = await publishedFound({ status: "ready_to_collect" });
    await submitClaim(t.db, item.slug, claimValues(), ctx, { now: NOW, env });
    const [c] = await t.db.select().from(cases).where(eq(cases.id, item.caseId!));
    expect(c!.status).toBe("ready_to_collect");
    expect(await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.caseId, item.caseId!))).toHaveLength(1);
  });

  it("refuses an item that is not published, has no case, or is closed", async () => {
    const draft = await publishedFound({ published: false });
    await expect(submitClaim(t.db, draft.slug, claimValues(), ctx, { now: NOW, env })).rejects.toMatchObject({ reason: "not_found" });
    const legacy = await publishedFound({ withCase: false });
    await expect(findClaimTarget(t.db, legacy.slug)).rejects.toMatchObject({ reason: "no_case" });
    await expect(findClaimTarget(t.db, "no-such-item")).rejects.toBeInstanceOf(ClaimUnavailableError);
    const closed = await publishedFound({ status: "listed" });
    await transition(t.db, closed.caseId!, "returned", officer, { now: NOW });
    await expect(findClaimTarget(t.db, closed.slug)).rejects.toMatchObject({ reason: "closed" });
    const resolved = await publishedFound({ status: "listed" });
    await t.db.update(lostFoundItems).set({ registerStatus: "returned" }).where(eq(lostFoundItems.slug, resolved.slug));
    await expect(findClaimTarget(t.db, resolved.slug)).rejects.toMatchObject({ reason: "closed" });
  });

  it("refuses an invalid claim without writing anything", async () => {
    const item = await publishedFound({ status: "listed" });
    await expect(submitClaim(t.db, item.slug, claimValues({ proof: "" }), ctx, { now: NOW, env })).rejects.toMatchObject({ step: "proof" });
    await expect(submitClaim(t.db, item.slug, claimValues({ consent: "" }), ctx, { now: NOW, env })).rejects.toMatchObject({ step: "contact" });
    expect(await t.db.select().from(lostFoundClaims).where(eq(lostFoundClaims.caseId, item.caseId!))).toHaveLength(0);
    const [c] = await t.db.select().from(cases).where(eq(cases.id, item.caseId!));
    expect(c!.status).toBe("listed");
  });

  it("rolls the claim back when encryption is unavailable", async () => {
    const item = await publishedFound({ status: "listed" });
    await expect(submitClaim(t.db, item.slug, claimValues(), ctx, { now: NOW, env: { NODE_ENV: "production" } })).rejects.toBeInstanceOf(PiiUnavailableError);
    expect(await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, item.caseId!))).toHaveLength(0);
    const [c] = await t.db.select().from(cases).where(eq(cases.id, item.caseId!));
    expect(c!.status).toBe("listed");
  });

  it("finishes a claim journey through the same path as a report", async () => {
    const item = await publishedFound({ status: "listed" });
    const started = new Date(NOW.getTime() - 60_000);
    const { token, id } = await startJourney(t.db, { kind: "claim", locale: "en", slug: item.slug }, { now: started, env });
    const loaded = await loadJourney(t.db, token, "claim", { now: started, env });
    await saveJourney(t.db, id, { ...loaded!.data, values: claimValues() }, { now: started, env });
    const result = await finishJourney(t.db, id, ctx, { now: NOW, env });
    expect(result.reference).toBe(item.reference);
    expect(result.email).toBe("nok@example.com");
  });
});

describe("tracking link email", () => {
  it("is bilingual, carries the reference and link, and escapes the html", () => {
    const link = "https://example.test/th/lost-and-found/track/link?ref=LF-2026-0001&t=abc";
    const mail = trackingLinkEmail("lost", "LF-2026-0001", link);
    expect(mail.subject).toContain("LF-2026-0001");
    expect(mail.text).toContain(link);
    expect(mail.text).toContain("ลิงก์ส่วนตัว");
    expect(mail.text).toContain("Your private link");
    expect(mail.html).toContain("&amp;t=abc");
    expect(mail.html).toContain('lang="th"');
    expect(trackingLinkEmail("claim", "LF-2026-0001", link).text).toContain("track your claim");
  });
});
