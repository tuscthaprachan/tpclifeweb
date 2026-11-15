import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/**
 * The session timeout dialog's phases. `warning` and `extending` show the
 * dialog; `expired` is final, so leaving the page is triggered exactly once.
 */
export type SessionPhase = "idle" | "warning" | "extending" | "expired";

export interface SessionTimeoutState {
  phase: SessionPhase;
  /** When the session ends, ms since the epoch, in server time. */
  endsAt: number;
  /** The current time in server time, ms since the epoch. */
  now: number;
}

export type SessionTimeoutEvent = { type: "tick"; now: number } | { type: "extend" } | { type: "extended"; endsAt: number; now: number } | { type: "extendFailed" };

function phaseAt(endsAt: number, now: number, warningMs: number, current: SessionPhase): SessionPhase {
  if (endsAt - now <= 0) return "expired";
  if (current === "extending") return current;
  return endsAt - now <= warningMs ? "warning" : "idle";
}

export function initialSessionTimeout(endsAt: number, now: number, warningMs: number): SessionTimeoutState {
  return { phase: phaseAt(endsAt, now, warningMs, "idle"), endsAt, now };
}

/** Time moves the phase; "Stay signed in" holds it at `extending` until the server answers, and a refusal or a failure ends the session. */
export function sessionTimeoutReducer(state: SessionTimeoutState, event: SessionTimeoutEvent, warningMs: number): SessionTimeoutState {
  if (state.phase === "expired") return state;
  switch (event.type) {
    case "tick":
      return { ...state, now: event.now, phase: phaseAt(state.endsAt, event.now, warningMs, state.phase) };
    case "extend":
      return state.phase === "warning" ? { ...state, phase: "extending" } : state;
    case "extended":
      return { phase: phaseAt(event.endsAt, event.now, warningMs, "idle"), endsAt: event.endsAt, now: event.now };
    case "extendFailed":
      return { ...state, phase: "expired" };
  }
}

/** Whether the dialog is showing. */
export function sessionDialogOpen(state: SessionTimeoutState): boolean {
  return state.phase === "warning" || state.phase === "extending";
}

/** The countdown in words: minutes from two, then minutes and seconds, then seconds. */
export function formatRemaining(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes >= 2) return a("timeoutMinutes", locale, { count: minutes });
  if (minutes === 1 && seconds === 0) return a("timeoutMinute", locale, { count: 1 });
  if (minutes === 1) return `${a("timeoutMinute", locale, { count: 1 })} ${a("timeoutSeconds", locale, { count: seconds })}`;
  return a("timeoutSeconds", locale, { count: seconds });
}
