/**
 * Rules for a redirect, shared by the admin form and by the automatic
 * redirects a slug change creates. Pure.
 */

export type RedirectField = "from" | "to" | "status";

export type RedirectProblem =
  | "fromRequired"
  | "fromShape"
  | "fromReserved"
  | "toRequired"
  | "toShape"
  | "toExternal"
  | "selfLoop"
  | "loop"
  | "statusInvalid";

export const REDIRECT_STATUSES = [301, 308] as const;
export type RedirectStatus = (typeof REDIRECT_STATUSES)[number];

export const MAX_CHAIN = 8;
const MAX_PATH = 500;
const RESERVED = ["/admin", "/api", "/_next"];

export interface RedirectInput {
  from: string;
  to: string;
  status: number;
}

export interface RedirectValue {
  from: string;
  to: string;
  status: RedirectStatus;
}

export type RedirectResult =
  | { ok: true; value: RedirectValue }
  | { ok: false; errors: Partial<Record<RedirectField, RedirectProblem>> };

/** Trims, and drops a trailing slash from a path other than the root. */
export function normalisePath(path: string): string {
  const trimmed = path.trim();
  return trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.replace(/\/+$/, "") || "/" : trimmed;
}

/** The path part of a target, without its query or fragment, for comparing it with a source path. */
const pathOnly = (target: string): string => normalisePath(target.split(/[?#]/)[0] ?? target);

export const isAbsoluteTarget = (to: string): boolean => /^https?:\/\//i.test(to);

function checkFrom(from: string): RedirectProblem | null {
  if (from === "") return "fromRequired";
  if (!from.startsWith("/") || from.startsWith("//") || /[\s?#\\]/.test(from) || from.length > MAX_PATH) return "fromShape";
  if (RESERVED.some((r) => from === r || from.startsWith(`${r}/`))) return "fromReserved";
  return null;
}

function checkTo(to: string): RedirectProblem | null {
  if (to === "") return "toRequired";
  if (to.length > MAX_PATH || /\s/.test(to)) return "toShape";
  if (isAbsoluteTarget(to)) {
    if (!/^https:\/\//i.test(to)) return "toExternal";
    try {
      return new URL(to).hostname ? null : "toShape";
    } catch {
      return "toShape";
    }
  }
  if (!to.startsWith("/") || to.startsWith("//") || to.includes("\\")) return "toShape";
  return null;
}

/**
 * Follows `to` through `existing` redirects; true when it comes back to
 * `from` or does not settle within `MAX_CHAIN` hops.
 */
export function wouldLoop(from: string, to: string, existing: readonly { fromPath: string; toPath: string }[]): boolean {
  const next = new Map(existing.map((r) => [r.fromPath, r.toPath]));
  let at = pathOnly(to);
  for (let hop = 0; hop < MAX_CHAIN; hop++) {
    if (at === from) return true;
    const target = next.get(at);
    if (target === undefined) return false;
    if (isAbsoluteTarget(target)) return false;
    at = pathOnly(target);
  }
  return true;
}

/**
 * Validates one redirect. `existing` is every other redirect (leave out the
 * one being edited), used to refuse a loop.
 */
export function validateRedirect(input: RedirectInput, existing: readonly { fromPath: string; toPath: string }[] = []): RedirectResult {
  const from = normalisePath(input.from);
  const to = isAbsoluteTarget(input.to.trim()) ? input.to.trim() : normalisePath(input.to);
  const errors: Partial<Record<RedirectField, RedirectProblem>> = {};

  const fromProblem = checkFrom(from);
  if (fromProblem) errors.from = fromProblem;
  const toProblem = checkTo(to);
  if (toProblem) errors.to = toProblem;
  if (!(REDIRECT_STATUSES as readonly number[]).includes(input.status)) errors.status = "statusInvalid";

  if (!errors.from && !errors.to) {
    if (!isAbsoluteTarget(to) && pathOnly(to) === from) errors.to = "selfLoop";
    else if (!isAbsoluteTarget(to) && wouldLoop(from, to, existing)) errors.to = "loop";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { from, to, status: input.status as RedirectStatus } };
}
