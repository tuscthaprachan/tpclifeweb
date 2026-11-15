/** One live result as the search endpoint returns it, before the palette turns it into a row. */
export interface RemoteResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  group: string;
}

/** The live search for the query `q`: not started, waiting, answered or failed. */
export type RemoteState<R = RemoteResult> = { status: "idle" } | { status: "loading"; q: string } | { status: "ok"; q: string; results: R[] } | { status: "error"; q: string };

export type RemoteEvent<R = RemoteResult> = { type: "start"; q: string } | { type: "succeeded"; q: string; results: R[] } | { type: "failed"; q: string } | { type: "reset" };

export const MIN_REMOTE_CHARS = 2;

export function initialRemote<R = RemoteResult>(): RemoteState<R> {
  return { status: "idle" };
}

/** An answer only lands while its own query is the one being waited for, so a slow reply for an old query is dropped. */
export function remoteReducer<R = RemoteResult>(state: RemoteState<R>, event: RemoteEvent<R>): RemoteState<R> {
  switch (event.type) {
    case "start":
      return { status: "loading", q: event.q };
    case "succeeded":
      return state.status === "loading" && state.q === event.q ? { status: "ok", q: event.q, results: event.results } : state;
    case "failed":
      return state.status === "loading" && state.q === event.q ? { status: "error", q: event.q } : state;
    case "reset":
      return state.status === "idle" ? state : { status: "idle" };
  }
}

/** What the palette shows for the typed query: a state for another query counts as still loading. */
export type RemoteView<R = RemoteResult> = { status: "idle" } | { status: "loading" } | { status: "ok"; results: R[] } | { status: "error" };

export function remoteView<R = RemoteResult>(state: RemoteState<R>, trimmed: string, enabled: boolean): RemoteView<R> {
  if (!enabled || trimmed.length < MIN_REMOTE_CHARS) return { status: "idle" };
  if (state.status === "idle" || state.q !== trimmed || state.status === "loading") return { status: "loading" };
  return state.status === "ok" ? { status: "ok", results: state.results } : { status: "error" };
}

/** Case-insensitive fuzzy score of `query` in `text`; null when it does not match. Higher is better. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  let total = 0;
  for (const word of q.split(/\s+/)) {
    const at = t.indexOf(word);
    if (at >= 0) {
      total += 100 - Math.min(at, 50) + (at === 0 || t[at - 1] === " " ? 20 : 0);
      continue;
    }
    let cursor = -1;
    let gaps = 0;
    for (const ch of word) {
      const next = t.indexOf(ch, cursor + 1);
      if (next < 0) return null;
      gaps += cursor < 0 ? 0 : next - cursor - 1;
      cursor = next;
    }
    total += Math.max(1, 40 - gaps);
  }
  return total;
}
