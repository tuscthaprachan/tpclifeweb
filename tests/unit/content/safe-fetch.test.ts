import { describe, expect, it, vi } from "vitest";
import { safeFetch, safeFetchResult } from "@/lib/content/safe-fetch";

describe("safeFetchResult", () => {
  it("marks a read that returned nothing as ok", async () => {
    expect(await safeFetchResult("empty", async () => [] as string[], [])).toEqual({ ok: true, data: [] });
  });

  it("marks a read that threw as failed, with the fallback", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await safeFetchResult("down", async () => Promise.reject(new Error("db")), [] as string[])).toEqual({ ok: false, data: [] });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("does not remember a failure: the next read can succeed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    const run = async () => {
      calls += 1;
      if (calls === 1) throw new Error("db");
      return ["row"];
    };
    expect((await safeFetchResult("flaky", run, [])).ok).toBe(false);
    expect(await safeFetchResult("flaky", run, [])).toEqual({ ok: true, data: ["row"] });
    error.mockRestore();
  });

  it("safeFetch still returns only the data", async () => {
    expect(await safeFetch("ok", async () => 1, 0)).toBe(1);
  });
});
