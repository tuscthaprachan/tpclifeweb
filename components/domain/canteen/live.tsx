import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { newSeed } from "@/lib/canteen/random";

/**
 * The browser side of the /eat pages. The pages are prerendered, so the query
 * is read here, from the address bar, and everything that used to be worked
 * out on the server for a request is worked out from it.
 */

/** The address bar's query with every repeated value kept (a plain GET of the filter form repeats `diet`). */
export function useSearch(): URLSearchParams {
  const params = useSearchParams();
  return useMemo(() => new URLSearchParams(params.toString()), [params]);
}

/** What the server fixed for the request, so the first browser render matches the HTML. */
export interface ServerRender {
  /** `new Date().toISOString()` of the request. */
  now: string;
  /** A fresh seed for the links that spin or reroll, for the pages that have any. */
  seed?: string;
}

export interface RenderState {
  now: Date;
  seed: string;
}

interface Held extends RenderState {
  key: string;
}

/**
 * The clock and a fresh seed for one render of a page. The server's values are used for the first render, and both
 * are made again whenever `key` (the query) changes, as a new request used to do.
 */
export function useRenderState(key: string, server?: ServerRender): RenderState {
  const [held, setHeld] = useState<Held>(() => ({ key, now: server ? new Date(server.now) : new Date(), seed: server?.seed ?? newSeed() }));
  if (held.key === key) return held;
  const next: Held = { key, now: new Date(), seed: newSeed() };
  setHeld(next);
  return next;
}

/** Replaces the address with the canonical one, as the server's redirect did, keeping the fragment. */
export function CanonicalRedirect({ search, compute }: { search: string; compute: () => string | null }) {
  const router = useRouter();
  const go = useEffectEvent(() => {
    const to = compute();
    if (to !== null) router.replace(to.includes("#") ? to : `${to}${window.location.hash}`, { scroll: false });
  });
  useEffect(() => {
    go();
  }, [search]);
  return null;
}
