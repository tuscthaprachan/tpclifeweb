import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REFRESH_MS, findRedirect, resetRedirectCache } from "@/lib/redirects/proxy-cache";

const fetchMock = vi.fn();

beforeEach(() => {
  resetRedirectCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ map: { "/en/news/old": { to: "/en/news/new", status: 301 } } })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("findRedirect", () => {
  it("loads the map once and answers later requests from memory", async () => {
    expect(await findRedirect("http://x", "/en/news/old", 1000)).toEqual({ to: "/en/news/new", status: 301 });
    expect(await findRedirect("http://x", "/en/news/other", 2000)).toBeUndefined();
    expect(await findRedirect("http://x", "/en/news/old/", 3000)).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes in the background after the interval without blocking the request", async () => {
    await findRedirect("http://x", "/a", 1000);
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ map: { "/a": { to: "/b", status: 308 } } })));
    expect(await findRedirect("http://x", "/a", 1000 + REFRESH_MS + 1)).toBeUndefined();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(await findRedirect("http://x", "/a", 1000 + REFRESH_MS + 2)).toEqual({ to: "/b", status: 308 });
  });

  it("keeps the last good map when a refresh fails", async () => {
    await findRedirect("http://x", "/en/news/old", 1000);
    fetchMock.mockImplementation(async () => new Response("no", { status: 503 }));
    await findRedirect("http://x", "/x", 1000 + REFRESH_MS + 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(await findRedirect("http://x", "/en/news/old", 1000 + REFRESH_MS + 2)).toBeDefined();
  });

  it("sends gathered hits with the next refresh when a secret is set", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    await findRedirect("http://x", "/en/news/old", 1000);
    await findRedirect("http://x", "/en/news/old", 2000);
    await findRedirect("http://x", "/nothing", 1000 + REFRESH_MS + 1);
    await vi.waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(post[1].body)).toEqual({ hits: { "/en/news/old": 2 } });
    expect(post[1].headers.authorization).toBe("Bearer s3cret");
  });
});
