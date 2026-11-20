export const FILTERED_SEGMENT = "filtered";
export const FILTERED_HEADER = "x-trytpc-filtered";

/**
 * Set for the session by an inline script in the locale layout, so it is only
 * ever present when JavaScript runs. A full page load that carries it gets the
 * prerendered page, which reads the query in the browser exactly as a client
 * navigation does. Without it the proxy rewrites the request to the
 * server-rendered copy under `filtered/`, so every query still works with
 * JavaScript off.
 */
export const JS_COOKIE = "trytpc_js";
export const JS_BOOT_SCRIPT = `try{if(!/(?:^|; )${JS_COOKIE}=/.test(document.cookie))document.cookie="${JS_COOKIE}=1; path=/; SameSite=Lax"}catch(e){}`;

const QUERY_ROUTES: readonly RegExp[] = [
  /^\/forms$/,
  /^\/news$/,
  /^\/policy$/,
  /^\/directory$/,
  /^\/performance$/,
  /^\/about\/open-data\/tusc\/decisions$/,
  /^\/lost-and-found$/,
  /^\/search$/,
  /^\/eat$/,
  /^\/eat\/(dishes|what-is|stalls)$/,
  /^\/eat\/(dishes|what-is|stalls)\/[^/]+$/,
  /^\/eat\/(plan|map|mine|pick)$/,
  /^\/about\/open-data\/tusc\/funds$/,
];

export function isQueryRoute(path: string): boolean {
  return QUERY_ROUTES.some((route) => route.test(path));
}

export function hasReaderQuery(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) if (key !== "_rsc") return true;
  return false;
}
