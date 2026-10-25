import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  createCase,
  getCase,
  issueTrackingLink,
  purgeExpiredPii,
  readContacts,
  resolveTrackingLink,
  revokeTrackingLinks,
  staffTimeline,
  transition,
  consumeTrackingAttempt,
  TRACKING_RATE_RULE,
  type StaffActor,
} from "@/lib/cases";
import { auditLog, caseAccessTokens, caseAttachments, caseContacts } from "@/lib/db/schema";
import { createMemoryStorage } from "@/lib/storage";
import { setup } from "./helpers";

let t: Awaited<ReturnType<typeof setup>>;
let officer: StaffActor;
const NOW = new Date("2026-05-01T00:00:00Z");

beforeAll(async () => {
  t = await setup();
  officer = await t.staff("Officer", "lf_officer");
});

async function fresh() {
  return createCase(t.db, { service: "lost_found", kind: "lost", contacts: [{ role: "reporter", email: "r@example.org", name: "Reporter" }] }, { kind: "public" }, { now: NOW });
}

describe("tracking links", () => {
  it("resolves with the reference and link, stores only a hash", async () => {
    const c = await fresh();
    const { token } = await issueTrackingLink(t.db, c.id, { kind: "public" }, { now: NOW });
    expect(token).toHaveLength(43);
    const [stored] = await t.db.select().from(caseAccessTokens).where(eq(caseAccessTokens.caseId, c.id));
    expect(stored!.tokenHash).not.toContain(token);
    expect(stored!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const found = await resolveTrackingLink(t.db, c.reference, token, NOW);
    expect(found).toMatchObject({ id: c.id, reference: c.reference, kind: "lost" });
    expect(await resolveTrackingLink(t.db, ` ${c.reference.toLowerCase()} `, token, NOW)).not.toBeNull();
  });

  it("returns null for a wrong reference, wrong or malformed token", async () => {
    const c = await fresh();
    const other = await fresh();
    const { token } = await issueTrackingLink(t.db, c.id, { kind: "public" }, { now: NOW });
    expect(await resolveTrackingLink(t.db, other.reference, token, NOW)).toBeNull();
    expect(await resolveTrackingLink(t.db, c.reference, token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), NOW)).toBeNull();
    expect(await resolveTrackingLink(t.db, c.reference, "short", NOW)).toBeNull();
    expect(await resolveTrackingLink(t.db, c.reference, "", NOW)).toBeNull();
  });

  it("expires", async () => {
    const c = await fresh();
    const expiresAt = new Date("2026-05-08T00:00:00Z");
    const { token } = await issueTrackingLink(t.db, c.id, { kind: "system" }, { now: NOW, expiresAt });
    expect(await resolveTrackingLink(t.db, c.reference, token, new Date("2026-05-07T23:59:59Z"))).not.toBeNull();
    expect(await resolveTrackingLink(t.db, c.reference, token, expiresAt)).toBeNull();
  });

  it("revokes (staff only) and logs it", async () => {
    const c = await fresh();
    const { token } = await issueTrackingLink(t.db, c.id, { kind: "public" }, { now: NOW });
    await expect(revokeTrackingLinks(t.db, c.id, { kind: "public" })).rejects.toMatchObject({ code: "forbidden" });
    expect(await revokeTrackingLinks(t.db, c.id, officer, { now: NOW })).toBe(1);
    expect(await resolveTrackingLink(t.db, c.reference, token, NOW)).toBeNull();
    expect((await staffTimeline(t.db, c.id, officer)).map((e) => e.type)).toContain("tracking_link_revoked");
  });

  it("counts attempts against a rate limit", async () => {
    let last = await consumeTrackingAttempt(t.db, "ip-1", 1000);
    for (let i = 0; i < TRACKING_RATE_RULE.max; i++) last = await consumeTrackingAttempt(t.db, "ip-1", 1000);
    expect(last.allowed).toBe(false);
    expect((await consumeTrackingAttempt(t.db, "ip-2", 1000)).allowed).toBe(true);
  });
});

describe("retention", () => {
  it("deletes contacts and attachment objects only after the date, and audits", async () => {
    const storage = createMemoryStorage();
    const c = await fresh();
    const { token } = await issueTrackingLink(t.db, c.id, { kind: "public" }, { now: NOW });
    await storage.put("lf/items/photo-1.jpg", new Uint8Array([1, 2, 3]), { visibility: "private", contentType: "image/jpeg", maxBytes: 100 });
    await t.db.insert(caseAttachments).values({ caseId: c.id, storageKey: "lf/items/photo-1.jpg", contentType: "image/jpeg", size: 3 });
    const closed = new Date("2026-06-01T00:00:00Z");
    await transition(t.db, c.id, "closed_unfound", officer, { now: closed });

    expect((await purgeExpiredPii(t.db, new Date("2027-05-31T23:59:59Z"), () => storage)).purged).toBe(0);
    expect(storage.has("lf/items/photo-1.jpg")).toBe(true);

    const result = await purgeExpiredPii(t.db, new Date("2027-06-01T00:00:01Z"), () => storage);
    expect(result).toMatchObject({ purged: 1, contacts: 1, attachments: 1, failed: 0 });
    expect(storage.has("lf/items/photo-1.jpg")).toBe(false);
    expect(await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, c.id))).toHaveLength(0);
    expect(await t.db.select().from(caseAttachments).where(eq(caseAttachments.caseId, c.id))).toHaveLength(0);
    const row = await getCase(t.db, c.id, officer);
    expect(row.piiDeletedAt).not.toBeNull();
    expect(row.reference).toBe(c.reference);
    expect(await resolveTrackingLink(t.db, c.reference, token, closed)).toBeNull();
    expect(await readContacts(t.db, c.id, officer)).toEqual([]);
    const audits = await t.db.select().from(auditLog).where(eq(auditLog.action, "case.pii_purge"));
    expect(audits.some((a) => a.entityId === c.id)).toBe(true);
    expect((await staffTimeline(t.db, c.id, officer)).map((e) => e.type)).toContain("pii_deleted");

    expect((await purgeExpiredPii(t.db, new Date("2028-01-01T00:00:00Z"), () => storage)).purged).toBe(0);
  });

  it("does not touch open cases, and cannot reopen a purged case", async () => {
    const open = await fresh();
    const done = await fresh();
    await transition(t.db, done.id, "withdrawn", { kind: "public" }, { now: new Date("2026-06-01T00:00:00Z") });
    await purgeExpiredPii(t.db, new Date("2030-01-01T00:00:00Z"));
    expect(await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, open.id))).toHaveLength(1);
    expect((await getCase(t.db, open.id, officer)).piiDeletedAt).toBeNull();
    await expect(transition(t.db, done.id, "searching", officer)).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("retries a case whose file deletion fails", async () => {
    const c = await fresh();
    await t.db.insert(caseAttachments).values({ caseId: c.id, storageKey: "lf/items/photo-2.jpg", contentType: "image/jpeg", size: 1 });
    await transition(t.db, c.id, "closed_unfound", officer, { now: new Date("2020-01-01T00:00:00Z") });
    const broken = { delete: async () => { throw new Error("boom"); } } as unknown as ReturnType<typeof createMemoryStorage>;
    const failed = await purgeExpiredPii(t.db, NOW, () => broken);
    expect(failed.failed).toBe(1);
    expect((await getCase(t.db, c.id, officer)).piiDeletedAt).toBeNull();
    expect((await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, c.id))).length).toBe(1);
    const ok = await purgeExpiredPii(t.db, NOW, () => createMemoryStorage());
    expect(ok.purged).toBe(1);
  });
});
