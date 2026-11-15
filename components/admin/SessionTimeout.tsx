"use client";

/**
 * The GOV.UK session timeout warning: a modal dialog two minutes before the
 * session ends, with a countdown, "Stay signed in", and a way to sign out.
 *
 * This is an enhancement. The server enforces the limits on every request
 * (lib/auth/session.ts); without JavaScript there is no dialog and the person
 * simply meets the "You have been signed out" page on their next click.
 *
 * The countdown follows the server's `endsAt`, which moves whenever any
 * request counts as activity. "Stay signed in" calls a Server Action, which is
 * such a request, and returns the new end time. When the time is up the page
 * reloads /admin and lets the server decide (another tab may have kept the
 * session alive), rather than assuming.
 */

import { useCallback, useEffect, useReducer, useState } from "react";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, Dialog } from "@/components/ui";
import { extendSession, signOutAction } from "@/app/admin/actions";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { TIMEOUT_WARNING_MS } from "@/lib/auth/session-policy";
import { formatRemaining, initialSessionTimeout, sessionDialogOpen, sessionTimeoutReducer, type SessionTimeoutEvent, type SessionTimeoutState } from "./hooks/session-timeout-machine";

interface SessionTimeoutProps {
  /** When the session ends, ISO, from the server. */
  endsAt: string;
  /** The server's clock when the page was made, so a wrong device clock cannot make the warning loop. */
  serverNow: string;
  locale: Locale;
}

export function SessionTimeout({ endsAt: initialEndsAt, serverNow, locale }: SessionTimeoutProps) {
  // Server time minus device time, fixed when the page loads.
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [state, dispatch] = useReducer(
    (current: SessionTimeoutState, event: SessionTimeoutEvent) => sessionTimeoutReducer(current, event, TIMEOUT_WARNING_MS),
    undefined,
    () => initialSessionTimeout(new Date(initialEndsAt).getTime(), Date.now() + skew, TIMEOUT_WARNING_MS),
  );

  // Tick once a second. The state update is the callback's, not the effect body's.
  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "tick", now: Date.now() + skew }), 1000);
    return () => window.clearInterval(id);
  }, [skew]);

  const expired = state.phase === "expired";
  useEffect(() => {
    if (expired) window.location.assign("/admin");
  }, [expired]);

  const open = sessionDialogOpen(state);
  const staying = state.phase === "extending";
  const remaining = state.endsAt - state.now;

  const stay = useCallback(async () => {
    dispatch({ type: "extend" });
    try {
      const result = await extendSession();
      if (result) dispatch({ type: "extended", endsAt: new Date(result.endsAt).getTime(), now: Date.now() + skew });
      else dispatch({ type: "extendFailed" });
    } catch {
      dispatch({ type: "extendFailed" });
    }
  }, [skew]);

  return (
    <Dialog
      open={open}
      onClose={() => {
        // Closing the dialog by any route (Escape, the Close button) counts as staying.
        if (open) void stay();
      }}
      title={a("timeoutTitle", locale)}
      headingLevel={2}
      locale={locale}
      className="m-auto w-[min(32rem,calc(100%-2rem))]"
    >
      {/* Rendered only while open: it depends on the clock, which differs between server and browser. */}
      {open ? (
        <>
          <p className="m-0 flex items-start gap-[var(--space-3)]">
            <ConsoleIcon name="overdue" size={24} className="mt-[0.1em] text-ink-900" />
            <span>{a("timeoutBody", locale, { time: formatRemaining(remaining, locale) })}</span>
          </p>
          <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-4)]">
            <Button type="button" icon={<ConsoleIcon name="check" />} onClick={() => void stay()} loading={staying} loadingLabel="…">
              {a("staySignedIn", locale)}
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" icon={<ConsoleIcon name="signOut" />}>
                {a("signOut", locale)}
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
