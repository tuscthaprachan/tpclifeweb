import { lookupRedirect, type RedirectMap } from "./map";
import { normalisePath } from "./validate";

/**
 * The proxy's view of the redirect table. `proxy.ts` runs on every request and
 * must not query the database each time, so it keeps the flattened map in
 * memory per server instance and refreshes it from `/api/redirects` (which
 * itself reads through the data cache, tag `redirects`) at most once a
 * minute. A refresh never blocks a request except the very first one on a
 * cold instance, and a failed refresh keeps the last good map.
 *
 * Hits are counted in memory and sent back with the next refresh, so the
 * counts are approximate: an instance that stops before its next refresh
 * loses the tail.
 */

export const REFRESH_MS = 60_000;
const RETRY_MS = 15_000;
const COLD_TIMEOUT_MS = 1_500;
const REFRESH_TIMEOUT_MS = 4_000;

interface State {
  map: RedirectMap;
  /** When the map was last refreshed, or retried after a failure. 0 until the first attempt. */
  at: number;
  loading: Promise<void> | null;
  hits: Record<string, number>;
}

const g = globalThis as unknown as { __trytpcRedirects?: State };
const state: State = (g.__trytpcRedirects ??= { map: {}, at: 0, loading: null, hits: {} });

async function refresh(origin: string, now: number): Promise<void> {
  const outgoing = state.hits;
  const secret = process.env.CRON_SECRET;
  const sendHits = secret && Object.keys(outgoing).length > 0;
  if (sendHits) state.hits = {};
  try {
    const res = await fetch(`${origin}/api/redirects`, { cache: "no-store", signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`redirects ${res.status}`);
    const body = (await res.json()) as { map?: RedirectMap };
    state.map = body.map ?? {};
    state.at = now;
  } catch {
    state.at = now - REFRESH_MS + RETRY_MS;
  }
  if (sendHits) {
    try {
      const res = await fetch(`${origin}/api/redirects`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({ hits: outgoing }),
        cache: "no-store",
        signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error("hits");
    } catch {
      for (const [path, n] of Object.entries(outgoing)) state.hits[path] = (state.hits[path] ?? 0) + n;
    }
  }
}

function startRefresh(origin: string, now: number): Promise<void> {
  state.loading ??= refresh(origin, now).finally(() => {
    state.loading = null;
  });
  return state.loading;
}

/** Where `pathname` should go, if a redirect starts there. */
export async function findRedirect(origin: string, pathname: string, now: number = Date.now()): Promise<{ to: string; status: number } | undefined> {
  if (state.at === 0) {
    await Promise.race([startRefresh(origin, now), new Promise<void>((resolve) => setTimeout(resolve, COLD_TIMEOUT_MS))]);
  } else if (now - state.at >= REFRESH_MS) {
    void startRefresh(origin, now);
  }
  const target = lookupRedirect(state.map, pathname);
  if (!target) return undefined;
  const key = state.map[pathname] ? pathname : normalisePath(pathname);
  state.hits[key] = (state.hits[key] ?? 0) + 1;
  return target;
}

/** Test seam. */
export function resetRedirectCache(): void {
  state.map = {};
  state.at = 0;
  state.loading = null;
  state.hits = {};
}
