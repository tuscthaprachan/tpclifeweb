/**
 * The pure core of "the user spun, so play the reel". No React, DOM or storage.
 *
 * sessionStorage carries one `SpinRecord` from the click that asks for a spin
 * to the page that answers it, because a spin can be a full document load.
 * The page claims the record only if it names this address and is fresh, so a
 * stale flag never plays a reel on an unrelated navigation.
 */

/** The sessionStorage key that carries the record. */
export const SPIN_KEY = "canteen-spin";

/** How long a record stays claimable, in milliseconds. */
export const SPIN_FRESH_MS = 10_000;

/** The id of the style element that keeps the result hidden until the reel takes over. */
export const SPIN_PENDING_ID = "canteen-spin-pending";

/** What the click leaves behind for the page that answers it. */
export interface SpinRecord {
  /** Unique per spin, so the same address can play twice. */
  nonce: string;
  /** The address the spin goes to. Without a query string, any query on that path matches. */
  target: string;
  /** When it was armed, in epoch milliseconds. */
  at: number;
}

/** Where the reel is for the current result. */
export type SpinState = { status: "idle" } | { status: "playing"; nonce: string } | { status: "settled"; nonce: string };

/** What can happen to the reel. */
export type SpinEvent =
  | { type: "claimed"; nonce: string }
  | { type: "done"; nonce: string }
  | { type: "reset" };

/** The result of looking at the stored record from a page. */
export type SpinClaim =
  | { kind: "play"; nonce: string }
  | { kind: "keep" }
  | { kind: "drop" };

/** The state before any spin. */
export const SPIN_IDLE: SpinState = { status: "idle" };

/** Builds the record for a spin towards `target`. */
export function arm(target: string, now: number, nonce: string): SpinRecord {
  return { nonce, target, at: now };
}

/** Turns a stored string back into a record, or null if it is not one. */
export function parseSpinRecord(raw: string | null): SpinRecord | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { nonce, target, at } = value as Partial<SpinRecord>;
    if (typeof nonce !== "string" || typeof target !== "string" || typeof at !== "number") return null;
    return { nonce, target, at };
  } catch {
    return null;
  }
}

function parts(href: string): { path: string; query: string } | null {
  try {
    const url = new URL(href, "http://spin.invalid");
    const query = Array.from(url.searchParams, ([key, value]) => `${key}=${value}`)
      .sort()
      .join("&");
    return { path: url.pathname.replace(/\/$/, ""), query };
  } catch {
    return null;
  }
}

/** True when `target` names `current`: the same path, and the same query unless the target has none. */
export function sameTarget(target: string, current: string): boolean {
  const a = parts(target);
  const b = parts(current);
  if (!a || !b || a.path !== b.path) return false;
  return !target.includes("?") || a.query === b.query;
}

/** True while a record is young enough to answer. */
export function isFresh(record: SpinRecord, now: number): boolean {
  const age = now - record.at;
  return Number.isFinite(age) && age >= 0 && age < SPIN_FRESH_MS;
}

/** What a page at `currentHref` should do with the stored record: play it, leave it for another page, or drop it. */
export function claim(record: SpinRecord | null, currentHref: string, now: number): SpinClaim {
  if (!record) return { kind: "keep" };
  if (!isFresh(record, now)) return { kind: "drop" };
  return sameTarget(record.target, currentHref) ? { kind: "play", nonce: record.nonce } : { kind: "keep" };
}

/** The next reel state. A nonce already seen does not play again; a new one does, even for the same address. */
export function spinReduce(state: SpinState, event: SpinEvent): SpinState {
  switch (event.type) {
    case "claimed":
      return state.status !== "idle" && state.nonce === event.nonce ? state : { status: "playing", nonce: event.nonce };
    case "done":
      return state.status === "playing" && state.nonce === event.nonce ? { status: "settled", nonce: event.nonce } : state;
    case "reset":
      return state.status === "idle" ? state : SPIN_IDLE;
  }
}

/** The pre-paint script: hides the result for a fresh claimed spin, never under reduced motion, and always shows it again after 5 s. */
export const SPIN_PENDING_SCRIPT = `try{var r=JSON.parse(sessionStorage.getItem(${JSON.stringify(SPIN_KEY)})),a=Date.now()-r.at,u=new URL(r.target,location.href),n=function(x){return x.pathname.replace(/\\/$/,"")},q=function(s){return Array.from(new URLSearchParams(s),function(e){return e.join("=")}).sort().join("&")};if(a>=0&&a<${SPIN_FRESH_MS}&&n(u)===n(location)&&(r.target.indexOf("?")<0||q(u.search)===q(location.search))&&!matchMedia("(prefers-reduced-motion: reduce)").matches&&!document.getElementById(${JSON.stringify(SPIN_PENDING_ID)})){var s=document.createElement("style");s.id=${JSON.stringify(SPIN_PENDING_ID)};s.textContent=".fun-result{visibility:hidden}";document.head.appendChild(s);setTimeout(function(){s.remove()},5000)}}catch(e){}`;
