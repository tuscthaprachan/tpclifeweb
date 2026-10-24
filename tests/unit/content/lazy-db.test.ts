import { describe, expect, it, vi } from "vitest";
import { createLazyDb, parsePgliteUrl } from "@/lib/db/lazy";

describe("parsePgliteUrl", () => {
  it("reads memory and directory forms, and ignores real connection strings", () => {
    expect(parsePgliteUrl("pglite:memory")).toEqual({ dataDir: undefined });
    expect(parsePgliteUrl("pglite:./.pglite")).toEqual({ dataDir: "./.pglite" });
    expect(parsePgliteUrl("pglite:")).toEqual({ dataDir: undefined });
    expect(parsePgliteUrl("postgres://user@host/db")).toBeNull();
  });
});

describe("createLazyDb", () => {
  function fake() {
    const calls: string[] = [];
    const builder = (name: string) => ({
      from: (t: string) => ({
        where: (w: string) => ({ then: (resolve: (v: unknown) => void) => resolve([`${name}:${t}:${w}`]) }),
      }),
    });
    return {
      calls,
      client: {
        select: (n: string) => (calls.push("select"), builder(n)),
        transaction: async (fn: (tx: string) => Promise<unknown>) => (calls.push("transaction"), fn("tx")),
        execute: async (q: string) => `ran ${q}`,
      },
    };
  }

  it("opens once, on the first await, and replays the chain on the real client", async () => {
    const f = fake();
    const open = vi.fn(async () => f.client);
    const db = createLazyDb(open);
    const query = db.select("a").from("t").where("w");
    expect(open).not.toHaveBeenCalled();
    expect(await query).toEqual(["a:t:w"]);
    expect(await db.select("b").from("u").where("x")).toEqual(["b:u:x"]);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("supports transactions and execute, and passes errors through", async () => {
    const f = fake();
    const db = createLazyDb(async () => f.client);
    expect(await db.transaction(async (tx) => `in ${tx}`)).toBe("in tx");
    expect(await db.execute("select 1")).toBe("ran select 1");
    const broken = createLazyDb(async (): Promise<ReturnType<typeof fake>["client"]> => {
      throw new Error("cannot open");
    });
    await expect(Promise.resolve(broken.select("a"))).rejects.toThrow("cannot open");
  });

  it("hands out the real client's own members once it is open", async () => {
    const open = vi.fn(async () => ({ _: { fullSchema: { t: 1 } }, select: () => "real select", execute: async () => "ran" }));
    const db = createLazyDb(open);
    expect(open).not.toHaveBeenCalled();
    expect(await db.execute()).toBe("ran");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((db as unknown as { _: { fullSchema: unknown } })._.fullSchema).toEqual({ t: 1 });
    expect(db.select()).toBe("real select");
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("is not itself awaitable", async () => {
    const db = createLazyDb(async () => ({}));
    expect(await Promise.resolve(db)).toBe(db);
  });
});
