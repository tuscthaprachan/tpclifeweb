import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listPasskeys, recordPasskeyUse, removeOlderPasskeys, removePasskey, renamePasskey } from "@/lib/auth/passkeys";
import { auditLog, passkey } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];

let db: TestDb;
let alice: string;
let bob: string;
let n = 0;

async function addKey(userId: string, name: string | null, createdAt: Date) {
  const id = `pk_${++n}`;
  await db.insert(passkey).values({
    id,
    name,
    userId,
    publicKey: "key",
    credentialID: `cred_${id}`,
    counter: 0,
    deviceType: "multiDevice",
    backedUp: true,
    createdAt,
  });
  return id;
}

beforeEach(async () => {
  ({ db } = await createTestDb());
  alice = await makeUser(db, "Alice");
  bob = await makeUser(db, "Bob");
});

describe("listing passkeys", () => {
  it("lists only the person's own, oldest first, with last used when known", async () => {
    const second = await addKey(alice, "Laptop", new Date("2026-02-01T00:00:00Z"));
    const first = await addKey(alice, "Phone", new Date("2026-01-01T00:00:00Z"));
    await addKey(bob, "Bob's", new Date("2026-01-01T00:00:00Z"));
    await recordPasskeyUse(db, `cred_${first}`, new Date("2026-03-01T00:00:00Z"));
    const list = await listPasskeys(db, alice);
    expect(list.map((p) => p.id)).toEqual([first, second]);
    expect(list[0]?.lastUsedAt).toEqual(new Date("2026-03-01T00:00:00Z"));
    expect(list[1]?.lastUsedAt).toBeNull();
  });
});

describe("renaming", () => {
  it("renames the person's own passkey and audits it", async () => {
    const id = await addKey(alice, null, new Date());
    expect(await renamePasskey(db, { userId: alice, passkeyId: id, name: "  Work   laptop " })).toBe("renamed");
    expect((await listPasskeys(db, alice))[0]?.name).toBe("Work laptop");
    const rows = await db.select().from(auditLog).where(eq(auditLog.action, "auth.passkey.rename"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorUserId).toBe(alice);
  });

  it("refuses empty or overlong names, and someone else's passkey", async () => {
    const id = await addKey(alice, "Phone", new Date());
    expect(await renamePasskey(db, { userId: alice, passkeyId: id, name: "   " })).toBe("invalid_name");
    expect(await renamePasskey(db, { userId: alice, passkeyId: id, name: "x".repeat(61) })).toBe("invalid_name");
    expect(await renamePasskey(db, { userId: bob, passkeyId: id, name: "Mine now" })).toBe("not_found");
    expect((await listPasskeys(db, alice))[0]?.name).toBe("Phone");
  });
});

describe("removing", () => {
  it("removes one of several passkeys and audits it", async () => {
    const keep = await addKey(alice, "Phone", new Date("2026-01-01T00:00:00Z"));
    const drop = await addKey(alice, "Laptop", new Date("2026-02-01T00:00:00Z"));
    expect(await removePasskey(db, { userId: alice, passkeyId: drop })).toBe("removed");
    expect((await listPasskeys(db, alice)).map((p) => p.id)).toEqual([keep]);
    const rows = await db.select().from(auditLog).where(eq(auditLog.action, "auth.passkey.remove"));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorUserId: alice, entityId: drop });
  });

  it("never removes the last passkey", async () => {
    const only = await addKey(alice, "Phone", new Date());
    expect(await removePasskey(db, { userId: alice, passkeyId: only })).toBe("last_passkey");
    expect(await listPasskeys(db, alice)).toHaveLength(1);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "auth.passkey.remove"))).toHaveLength(0);
  });

  it("holds for two removals at once", async () => {
    const a = await addKey(alice, "A", new Date("2026-01-01T00:00:00Z"));
    const b = await addKey(alice, "B", new Date("2026-02-01T00:00:00Z"));
    const results = await Promise.all([removePasskey(db, { userId: alice, passkeyId: a }), removePasskey(db, { userId: alice, passkeyId: b })]);
    expect(results.filter((r) => r === "removed")).toHaveLength(1);
    expect(await listPasskeys(db, alice)).toHaveLength(1);
  });

  it("cannot touch someone else's passkey", async () => {
    await addKey(alice, "Phone", new Date());
    const bobs = await addKey(bob, "Bob phone", new Date());
    await addKey(bob, "Bob laptop", new Date());
    expect(await removePasskey(db, { userId: alice, passkeyId: bobs })).toBe("not_found");
    expect(await listPasskeys(db, bob)).toHaveLength(2);
  });

  it("after recovery, removes everything but the newest", async () => {
    await addKey(alice, "Old phone", new Date("2026-01-01T00:00:00Z"));
    await addKey(alice, "Old laptop", new Date("2026-02-01T00:00:00Z"));
    const newest = await addKey(alice, "New", new Date("2026-03-01T00:00:00Z"));
    await addKey(bob, "Bob", new Date("2026-01-01T00:00:00Z"));
    expect(await removeOlderPasskeys(db, { userId: alice })).toBe(2);
    expect((await listPasskeys(db, alice)).map((p) => p.id)).toEqual([newest]);
    expect(await listPasskeys(db, bob)).toHaveLength(1);
    expect(await removeOlderPasskeys(db, { userId: alice })).toBe(0);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "auth.passkey.remove"))).toHaveLength(2);
  });
});
