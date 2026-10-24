import { afterEach, describe, expect, it, vi } from "vitest";

const purge = vi.fn(async () => ({ purged: 2, contacts: 3, attachments: 1, failed: 0 }));
vi.mock("@/lib/cases/retention", () => ({ purgeExpiredPii: purge }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({}) }));

const { GET } = await import("@/app/api/cron/retention/route");

const call = (auth?: string) => GET(new Request("http://localhost/api/cron/retention", { headers: auth ? { authorization: auth } : {} }));

afterEach(() => {
  vi.unstubAllEnvs();
  purge.mockClear();
});

describe("/api/cron/retention", () => {
  it("is closed when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(503);
    expect(purge).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call("s3cret-value")).status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("runs the purge with the right secret", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    const res = await call("Bearer s3cret-value");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ purged: 2, contacts: 3, attachments: 1, failed: 0 });
    expect(purge).toHaveBeenCalledOnce();
  });
});
