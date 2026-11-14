import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { cleanDisplayName, listSessions, revokeOtherSessions, revokeSession, updateDisplayName } from "@/lib/admin/account/sessions";
import { parseUserAgent } from "@/lib/admin/account/user-agent";
import { auditLog } from "@/lib/db/schema/audit-log";
import { session, user } from "@/lib/db/schema/auth";
import { createTestDb, makeUser } from "../db/harness";

const NOW = new Date("2026-03-09T05:00:00Z");
const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
let me: string;
let someone: string;

async function addSession(id: string, userId: string, over: Partial<typeof session.$inferInsert> = {}) {
  await db.insert(session).values({ id, token: `tok-${id}`, userId, expiresAt: new Date(NOW.getTime() + 3_600_000), createdAt: NOW, updatedAt: NOW, ipAddress: "203.0.113.5", userAgent: CHROME_WIN, ...over });
}

beforeEach(async () => {
  ({ db } = await createTestDb());
  me = await makeUser(db, "Mali");
  someone = await makeUser(db, "Somchai");
  await addSession("current", me, { createdAt: new Date(NOW.getTime() - 1000) });
  await addSession("phone", me, { userAgent: SAFARI_IOS, createdAt: new Date(NOW.getTime() + 1000) });
  await addSession("old", me, { expiresAt: new Date(NOW.getTime() - 1000) });
  await addSession("theirs", someone);
});

const ids = async (userId: string) => (await db.select({ id: session.id }).from(session).where(eq(session.userId, userId))).map((r) => r.id).sort();
const audits = async () => (await db.select().from(auditLog)).map((r) => r.action);

describe("account sessions", () => {
  it("lists live sessions with the current one first", async () => {
    const rows = await listSessions(db, me, "current", NOW);
    expect(rows.map((r) => [r.id, r.current])).toEqual([["current", true], ["phone", false]]);
  });

  it("revokes one of the person's other sessions and audits it", async () => {
    expect(await revokeSession(db, { userId: me, sessionId: "phone", currentSessionId: "current", context: {} })).toBe("revoked");
    expect(await ids(me)).toEqual(["current", "old"]);
    expect(await audits()).toEqual(["auth.session_revoke"]);
    const [entry] = await db.select().from(auditLog);
    expect(entry).toMatchObject({ actorUserId: me, entityType: "user", entityId: me });
    expect(entry!.before).toMatchObject({ device: "Safari / iOS" });
  });

  it("refuses the current session and another person's session", async () => {
    expect(await revokeSession(db, { userId: me, sessionId: "current", currentSessionId: "current", context: {} })).toBe("current");
    expect(await revokeSession(db, { userId: me, sessionId: "theirs", currentSessionId: "current", context: {} })).toBe("gone");
    expect(await ids(someone)).toEqual(["theirs"]);
    expect(await audits()).toEqual([]);
  });

  it("signs out every other session but keeps the current one and other people's", async () => {
    expect(await revokeOtherSessions(db, { userId: me, currentSessionId: "current", context: {} })).toBe(2);
    expect(await ids(me)).toEqual(["current"]);
    expect(await ids(someone)).toEqual(["theirs"]);
    expect(await audits()).toEqual(["auth.session_revoke_others"]);
    expect(await revokeOtherSessions(db, { userId: me, currentSessionId: "current", context: {} })).toBe(0);
    expect(await audits()).toEqual(["auth.session_revoke_others"]);
  });
});

describe("display name", () => {
  it("cleans, saves and audits the before and after", async () => {
    expect(await updateDisplayName(db, { userId: me, name: "  Mali   Rattana \n", now: NOW, context: {} })).toBe("saved");
    const [row] = await db.select().from(user).where(eq(user.id, me));
    expect(row!.name).toBe("Mali Rattana");
    const [entry] = await db.select().from(auditLog);
    expect(entry).toMatchObject({ action: "account.update_name", before: { name: "Mali" }, after: { name: "Mali Rattana" } });
  });

  it("reports an unchanged or invalid name and writes nothing", async () => {
    expect(await updateDisplayName(db, { userId: me, name: "Mali", context: {} })).toBe("unchanged");
    expect(await updateDisplayName(db, { userId: me, name: "   ", context: {} })).toBe("invalid");
    expect(await updateDisplayName(db, { userId: me, name: "x".repeat(101), context: {} })).toBe("invalid");
    expect(await audits()).toEqual([]);
    expect(cleanDisplayName("a\u0000b")).toBe("a b");
  });
});

describe("device description", () => {
  it("names common browsers and systems", () => {
    expect(parseUserAgent(CHROME_WIN)).toEqual({ browser: "Chrome", os: "Windows" });
    expect(parseUserAgent(SAFARI_IOS)).toEqual({ browser: "Safari", os: "iOS" });
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/126.0 Safari/537.36 Edg/126.0")).toEqual({ browser: "Edge", os: "Windows" });
    expect(parseUserAgent(null)).toEqual({ browser: null, os: null });
  });
});
