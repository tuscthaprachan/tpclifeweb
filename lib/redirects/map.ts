import { MAX_CHAIN, isAbsoluteTarget, normalisePath } from "./validate";

export interface RedirectTarget {
  to: string;
  status: number;
}

export type RedirectMap = Record<string, RedirectTarget>;

/**
 * The lookup the proxy uses, with chains flattened: A to B and B to C becomes
 * A to C, so a reader is redirected once. A loop, or a chain that does not
 * settle, drops the redirects involved rather than sending anyone round it.
 */
export function buildRedirectMap(rows: readonly { fromPath: string; toPath: string; status: number }[]): RedirectMap {
  const byFrom = new Map(rows.map((r) => [r.fromPath, r]));
  const out: RedirectMap = {};
  for (const row of rows) {
    let target = row.toPath;
    let status = row.status;
    const seen = new Set([row.fromPath]);
    let settled = false;
    for (let hop = 0; hop < MAX_CHAIN; hop++) {
      if (isAbsoluteTarget(target)) {
        settled = true;
        break;
      }
      const [path = target, rest = ""] = splitQuery(target);
      const next = byFrom.get(normalisePath(path));
      if (!next) {
        settled = true;
        break;
      }
      if (seen.has(next.fromPath)) break;
      seen.add(next.fromPath);
      target = rest ? `${next.toPath}${rest}` : next.toPath;
      status = next.status;
    }
    if (settled) out[row.fromPath] = { to: target, status };
  }
  return out;
}

function splitQuery(target: string): [string, string] {
  const i = target.search(/[?#]/);
  return i === -1 ? [target, ""] : [target.slice(0, i), target.slice(i)];
}

/** Exact match on the pathname, tolerating one trailing slash. */
export function lookupRedirect(map: RedirectMap, pathname: string): RedirectTarget | undefined {
  return map[pathname] ?? map[normalisePath(pathname)];
}
