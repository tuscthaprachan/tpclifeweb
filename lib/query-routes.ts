export const FILTERED_SEGMENT = "filtered";
export const FILTERED_HEADER = "x-trytpc-filtered";

const QUERY_ROUTES: readonly RegExp[] = [
  /^\/forms$/,
  /^\/news$/,
  /^\/policy$/,
  /^\/directory$/,
  /^\/performance$/,
  /^\/lost-and-found$/,
  /^\/search$/,
  /^\/eat$/,
  /^\/eat\/(dishes|what-is|stalls)$/,
  /^\/eat\/(dishes|what-is|stalls)\/[^/]+$/,
  /^\/eat\/(plan|map|mine|pick)$/,
];

export function isQueryRoute(path: string): boolean {
  return QUERY_ROUTES.some((route) => route.test(path));
}

export function hasReaderQuery(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) if (key !== "_rsc") return true;
  return false;
}
