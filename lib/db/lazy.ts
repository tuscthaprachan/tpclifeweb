/**
 * A synchronous handle on a database that opens asynchronously.
 *
 * PGlite has to be imported dynamically (see `lib/db/index.ts`) and then
 * migrated and seeded before its first query, but `getDb()` is called
 * synchronously all over the codebase. This returns an object that looks like
 * the Drizzle client and records the calls made on it: `db.select().from(t)
 * .where(w)` builds a chain of (method, arguments) steps. Nothing runs until
 * the chain is awaited, at which point the real client is opened (once),
 * the chain is replayed on it, and its result is awaited. Transactions and
 * `execute` are async already, so they simply wait for the client first.
 *
 * Once the client is open, every property read returns the real thing. So code that
 * needs real objects (Better Auth's Drizzle adapter reads `_.fullSchema` and
 * `query`, and builds subqueries with `.limit(1)` passed to `inArray`) works
 * from the second tick on. Before that, only top-level query builders and
 * `transaction` / `execute` are supported, which is all the app uses.
 *
 * No `server-only` import: pure, and covered by a unit test.
 */

type Open<T> = () => Promise<T>;

interface Step {
  method: string | symbol;
  args: unknown[];
}

function chain(open: Open<object>, steps: Step[]): unknown {
  const target = function () {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          replay(open, steps).then(resolve, reject);
      }
      if (prop === "catch" || prop === "finally") {
        return (...args: unknown[]) => {
          const promise = replay(open, steps) as unknown as Record<string, (...a: unknown[]) => unknown>;
          return promise[prop as string]!(...args);
        };
      }
      // A property read on the chain is a method name; the call that follows records its arguments.
      return (...args: unknown[]) => chain(open, [...steps, { method: prop, args }]);
    },
  });
}

async function replay(open: Open<object>, steps: Step[]): Promise<unknown> {
  let current: unknown = await open();
  for (const { method, args } of steps) {
    const fn = (current as Record<string | symbol, unknown>)[method];
    if (typeof fn !== "function") throw new Error(`Database client has no method ${String(method)}`);
    current = (fn as (...a: unknown[]) => unknown).apply(current, args);
  }
  return current;
}

/** `open` runs at most once; every caller waits for the same promise. */
export function createLazyDb<T extends object>(open: Open<T>): T {
  let opened: Promise<T> | undefined;
  let ready: T | undefined;
  const once: Open<T> = () => {
    if (!opened) {
      opened = open();
      opened.then(
        (client) => {
          ready = client;
        },
        () => {}, // awaiters see the rejection; this only stops it being reported as unhandled
      );
    }
    return opened;
  };
  return new Proxy({} as T, {
    get(_t, prop) {
      if (prop === "then") return undefined; // a handle is not itself awaitable
      if (ready) {
        const value = Reflect.get(ready, prop, ready);
        return typeof value === "function" ? value.bind(ready) : value;
      }
      return (...args: unknown[]) => chain(once, [{ method: prop, args }]);
    },
  });
}

/** `pglite:memory` or `pglite:<directory>`; null for any other URL. */
export function parsePgliteUrl(url: string): { dataDir: string | undefined } | null {
  if (!url.startsWith("pglite:")) return null;
  const rest = url.slice("pglite:".length).trim();
  return { dataDir: rest === "" || rest === "memory" ? undefined : rest };
}
