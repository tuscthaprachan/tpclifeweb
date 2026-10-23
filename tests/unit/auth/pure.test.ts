import { describe, expect, it } from "vitest";
import { decideAccess, type AccessSession } from "@/lib/auth/access";
import { withResponseCookies } from "@/lib/admin/cookies";
import {
  DEFAULT_ALLOWED_EMAIL_DOMAINS,
  emailDomain,
  isAllowedEmailDomain,
  isPlausibleEmail,
  parseAllowedDomains,
} from "@/lib/auth/domains";
import { decodeFlow, encodeFlow, FLOW_TTL_MS } from "@/lib/auth/flow-token";
import { type ActiveRole } from "@/lib/auth/roles";
import { ABSOLUTE_TIMEOUT_MS, IDLE_TIMEOUT_MS, isSessionLive, sessionDeadlines } from "@/lib/auth/session-policy";
import { generateToken, hashToken } from "@/lib/auth/tokens";

describe("allowed email domains", () => {
  it("defaults to the Thammasat domains", () => {
    expect(parseAllowedDomains(undefined)).toEqual([...DEFAULT_ALLOWED_EMAIL_DOMAINS]);
    expect(parseAllowedDomains("  ")).toEqual(["dome.tu.ac.th", "tu.ac.th"]);
  });

  it("reads a comma separated list, trimming, lower-casing and dropping @", () => {
    expect(parseAllowedDomains(" Example.org, @tu.ac.th ,,")).toEqual(["example.org", "tu.ac.th"]);
  });

  it("admits listed domains regardless of case", () => {
    expect(isAllowedEmailDomain("A@Dome.TU.ac.th", ["dome.tu.ac.th"])).toBe(true);
    expect(isAllowedEmailDomain("a@tu.ac.th", ["dome.tu.ac.th", "tu.ac.th"])).toBe(true);
  });

  it("matches the whole domain, never a suffix or subdomain", () => {
    const allowed = ["tu.ac.th"];
    expect(isAllowedEmailDomain("a@evil.tu.ac.th", allowed)).toBe(false);
    expect(isAllowedEmailDomain("a@eviltu.ac.th", allowed)).toBe(false);
    expect(isAllowedEmailDomain("a@tu.ac.th.evil.com", allowed)).toBe(false);
    expect(isAllowedEmailDomain("a@gmail.com", allowed)).toBe(false);
  });

  it("uses the last @ so a quoted trick cannot smuggle a domain", () => {
    expect(emailDomain("tu.ac.th@evil.com")).toBe("evil.com");
    expect(isAllowedEmailDomain("a@tu.ac.th@evil.com", ["tu.ac.th"])).toBe(false);
  });

  it("rejects things that are not addresses", () => {
    expect(isPlausibleEmail("nope")).toBe(false);
    expect(isPlausibleEmail("a b@tu.ac.th")).toBe(false);
    expect(isAllowedEmailDomain("", ["tu.ac.th"])).toBe(false);
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
  const base = { now, roles: editor, hasSecondFactor: true };

  it("sends the signed out to sign in", () => {
    expect(decideAccess({ ...base, session: null }).kind).toBe("unauthenticated");
  });

  it("times out an idle session", () => {
    const idle = { ...live, updatedAt: new Date(now.getTime() - IDLE_TIMEOUT_MS - 1) };
    expect(decideAccess({ ...base, session: idle }).kind).toBe("timed_out");
  });

  it("tells a student they have no access, without asking for a second factor", () => {
    const unverified = { ...live, secondFactorAt: null };
    expect(decideAccess({ ...base, session: unverified, roles: [], hasSecondFactor: false }).kind).toBe("not_staff");
  });

  it("asks staff with no second factor to set one up", () => {
    const unverified = { ...live, secondFactorAt: null };
    expect(decideAccess({ ...base, session: unverified, hasSecondFactor: false }).kind).toBe("second_factor_setup");
  });

  it("challenges staff who have a factor but have not passed it in this session", () => {
    const unverified = { ...live, secondFactorAt: null };
    expect(decideAccess({ ...base, session: unverified }).kind).toBe("second_factor_challenge");
  });

  it("lets verified staff in", () => {
    expect(decideAccess({ ...base, session: live }).kind).toBe("ok");
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

  it("checks the second factor before the role, so a role never hides a missing factor", () => {
    const unverified = { ...live, secondFactorAt: null };
    expect(decideAccess({ ...base, session: unverified, required: { role: "admin" } }).kind).toBe("second_factor_challenge");
  });
});

describe("sign-in flow cookie", () => {
  const secret = "a-secret-that-is-long-enough-for-hmac-0123456789";
  const t0 = 1_700_000_000_000;

  it("round-trips the email and invite token", () => {
    const value = encodeFlow({ email: "a@tu.ac.th", invite: "tok" }, secret, t0);
    expect(decodeFlow(value, secret, t0 + 1000)).toEqual({ email: "a@tu.ac.th", invite: "tok", exp: t0 + FLOW_TTL_MS });
  });

  it("expires", () => {
    const value = encodeFlow({ email: "a@tu.ac.th" }, secret, t0);
    expect(decodeFlow(value, secret, t0 + FLOW_TTL_MS + 1)).toBeNull();
  });

  it("rejects an edited value or the wrong secret", () => {
    const value = encodeFlow({ email: "a@tu.ac.th" }, secret, t0);
    const [body, sig] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "boss@tu.ac.th", exp: t0 + FLOW_TTL_MS })).toString("base64url");
    expect(decodeFlow(`${forged}.${sig}`, secret, t0)).toBeNull();
    expect(decodeFlow(`${body}.${sig}`, "another-secret-another-secret-0123456789", t0)).toBeNull();
    expect(decodeFlow("garbage", secret, t0)).toBeNull();
    expect(decodeFlow(undefined, secret, t0)).toBeNull();
  });
});

describe("withResponseCookies", () => {
  it("applies new and cleared cookies to the request cookie header", () => {
    const request = new Headers({ cookie: "a=1; session=old" });
    const response = new Headers();
    response.append("set-cookie", "session=new; Path=/; HttpOnly");
    response.append("set-cookie", "a=; Max-Age=0; Path=/");
    response.append("set-cookie", "b=2; Path=/");
    expect(withResponseCookies(request, response).get("cookie")).toBe("session=new; b=2");
  });
});
