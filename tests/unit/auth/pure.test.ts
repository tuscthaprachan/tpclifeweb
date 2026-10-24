import { describe, expect, it } from "vitest";
import { decideAccess, type AccessSession } from "@/lib/auth/access";
import { safeReturnPath } from "@/lib/admin/return-path";
import { encodeCeremonyContext, parseCeremonyContext } from "@/lib/auth/ceremony";
import { isPlausibleEmail, normaliseEmail } from "@/lib/auth/email-address";
import { cleanPasskeyName } from "@/lib/auth/passkeys";
import { cleanPersonName } from "@/lib/auth/enrolment";
import { type ActiveRole } from "@/lib/auth/roles";
import { ABSOLUTE_TIMEOUT_MS, IDLE_TIMEOUT_MS, isSessionLive, sessionDeadlines } from "@/lib/auth/session-policy";
import { generateToken, hashToken } from "@/lib/auth/tokens";

describe("email addresses", () => {
  it("normalises case and whitespace", () => {
    expect(normaliseEmail("  A@Example.ORG ")).toBe("a@example.org");
  });

  it("accepts any domain, since the invite is the authorisation", () => {
    expect(isPlausibleEmail("someone@gmail.com")).toBe(true);
    expect(isPlausibleEmail("a@dome.tu.ac.th")).toBe(true);
  });

  it("rejects things that are not addresses", () => {
    expect(isPlausibleEmail("nope")).toBe(false);
    expect(isPlausibleEmail("a b@tu.ac.th")).toBe(false);
    expect(isPlausibleEmail("")).toBe(false);
  });
});

describe("invite tokens", () => {
  it("makes long random tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it("hashes to a stable hex digest that is not the token", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).not.toBe(hashToken(generateToken()));
  });
});

describe("session limits", () => {
  const start = new Date("2026-01-01T09:00:00Z");
  const session = { updatedAt: start, expiresAt: new Date(start.getTime() + ABSOLUTE_TIMEOUT_MS) };

  it("ends after 30 minutes idle", () => {
    expect(IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
    expect(isSessionLive(session, new Date(start.getTime() + IDLE_TIMEOUT_MS - 1))).toBe(true);
    expect(isSessionLive(session, new Date(start.getTime() + IDLE_TIMEOUT_MS))).toBe(false);
  });

  it("ends after 12 hours however active the person is", () => {
    expect(ABSOLUTE_TIMEOUT_MS).toBe(12 * 60 * 60 * 1000);
    const lastSeen = new Date(session.expiresAt.getTime() - 60_000);
    const active = { ...session, updatedAt: lastSeen };
    expect(sessionDeadlines(active).endsAt).toEqual(session.expiresAt);
    expect(isSessionLive(active, new Date(session.expiresAt.getTime() + 1))).toBe(false);
  });
});

describe("requireStaff decision", () => {
  const now = new Date("2026-01-01T10:00:00Z");
  const live: AccessSession = {
    updatedAt: new Date(now.getTime() - 60_000),
    expiresAt: new Date(now.getTime() + 3_600_000),
    secondFactorAt: new Date(now.getTime() - 30_000),
  };
  const editor: ActiveRole[] = [{ role: "editor", organisationId: 1 }];
  const admin: ActiveRole[] = [{ role: "admin", organisationId: 2 }];
  const base = { now, roles: editor };

  it("sends the signed out to sign in", () => {
    expect(decideAccess({ ...base, session: null }).kind).toBe("unauthenticated");
  });

  it("times out an idle session", () => {
    const idle = { ...live, updatedAt: new Date(now.getTime() - IDLE_TIMEOUT_MS - 1) };
    expect(decideAccess({ ...base, session: idle }).kind).toBe("timed_out");
  });

  it("tells a signed-in person with no staff role they have no access", () => {
    const unmarked = { ...live, secondFactorAt: null };
    expect(decideAccess({ ...base, session: unmarked, roles: [] }).kind).toBe("not_staff");
  });

  it("lets staff in once the session came from a passkey", () => {
    expect(decideAccess({ ...base, session: live }).kind).toBe("ok");
  });

  it("sends staff whose session did not come from a passkey back to sign in", () => {
    expect(decideAccess({ ...base, session: { ...live, secondFactorAt: null } }).kind).toBe("passkey_required");
  });

  it("requires the named role", () => {
    expect(decideAccess({ ...base, session: live, required: { role: "admin" } }).kind).toBe("forbidden");
    expect(decideAccess({ ...base, session: live, roles: admin, required: { role: "admin" } }).kind).toBe("ok");
  });

  it("requires the role on behalf of the named organisation", () => {
    expect(decideAccess({ ...base, session: live, roles: admin, required: { role: "admin", organisationId: 1 } }).kind).toBe("forbidden");
    expect(decideAccess({ ...base, session: live, roles: admin, required: { role: "admin", organisationId: 2 } }).kind).toBe("ok");
  });

  it("requires any role in the organisation when no role is named", () => {
    expect(decideAccess({ ...base, session: live, required: { organisationId: 2 } }).kind).toBe("forbidden");
    expect(decideAccess({ ...base, session: live, required: { organisationId: 1 } }).kind).toBe("ok");
  });

  it("checks the passkey marker before the role, so a role never hides a missing one", () => {
    const unmarked = { ...live, secondFactorAt: null };
    expect(decideAccess({ ...base, session: unmarked, required: { role: "admin" } }).kind).toBe("passkey_required");
  });
});

describe("ceremony context", () => {
  it("round-trips an invite and a recovery link", () => {
    const invite = { kind: "invite" as const, token: "tok-1_a", name: "Somchai" };
    expect(parseCeremonyContext(encodeCeremonyContext(invite))).toEqual(invite);
    const recover = { kind: "recover" as const, token: "tok-2" };
    expect(parseCeremonyContext(encodeCeremonyContext(recover))).toEqual(recover);
  });

  it("refuses anything malformed, without throwing", () => {
    for (const bad of [undefined, null, "", "not json", "[]", "{}", '{"k":"other","t":"x"}', '{"k":"invite","t":"x"}', '{"k":"invite","t":"","n":"a"}', `{"k":"recover","t":"${"x".repeat(201)}"}`]) {
      expect(parseCeremonyContext(bad)).toBeNull();
    }
  });
});

describe("names", () => {
  it("cleans a person's name and refuses empty or overlong ones", () => {
    expect(cleanPersonName("  Somchai \n  Jaidee ")).toBe("Somchai Jaidee");
    expect(cleanPersonName("   ")).toBeNull();
    expect(cleanPersonName("x".repeat(101))).toBeNull();
    expect(cleanPersonName("x".repeat(100))).toBe("x".repeat(100));
  });

  it("cleans a passkey name to 60 characters", () => {
    expect(cleanPasskeyName(" Work   laptop ")).toBe("Work laptop");
    expect(cleanPasskeyName("")).toBeNull();
    expect(cleanPasskeyName("x".repeat(61))).toBeNull();
  });
});

describe("return paths", () => {
  it("keeps paths inside the console and nothing else", () => {
    expect(safeReturnPath("/admin/invite/abc_DEF-1")).toBe("/admin/invite/abc_DEF-1");
    expect(safeReturnPath("/admin")).toBe("/admin");
    expect(safeReturnPath("https://evil.example/admin")).toBe("/admin");
    expect(safeReturnPath("//evil.example")).toBe("/admin");
    expect(safeReturnPath("/administrator")).toBe("/admin");
    expect(safeReturnPath(undefined)).toBe("/admin");
  });
});

