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

import { useCallback, useEffect, useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { extendSession, signOutAction } from "@/app/admin/actions";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { TIMEOUT_WARNING_MS } from "@/lib/auth/session-policy";

function formatRemaining(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes >= 2) return a("timeoutMinutes", locale, { count: minutes });
  if (minutes === 1 && seconds === 0) return a("timeoutMinute", locale, { count: 1 });
  if (minutes === 1) return `${a("timeoutMinute", locale, { count: 1 })} ${a("timeoutSeconds", locale, { count: seconds })}`;
  return a("timeoutSeconds", locale, { count: seconds });
}

interface SessionTimeoutProps {
  /** When the session ends, ISO, from the server. */
  endsAt: string;
  /** The server's clock when the page was made, so a wrong device clock cannot make the warning loop. */
  serverNow: string;
  locale: Locale;
}

export function SessionTimeout({ endsAt: initialEndsAt, serverNow, locale }: SessionTimeoutProps) {
  const [endsAt, setEndsAt] = useState(() => new Date(initialEndsAt).getTime());
  // Server time minus device time, fixed when the page loads.
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now() + skew);
  const [staying, setStaying] = useState(false);

  // Tick once a second. The state update is the callback's, not the effect body's.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + skew), 1000);
    return () => window.clearInterval(id);
  }, [skew]);

  const remaining = endsAt - now;
  const open = remaining <= TIMEOUT_WARNING_MS && remaining > 0;

  useEffect(() => {
    if (remaining <= 0) window.location.assign("/admin");
  }, [remaining]);

  const stay = useCallback(async () => {
    setStaying(true);
    try {
      const result = await extendSession();
      if (result) {
        setEndsAt(new Date(result.endsAt).getTime());
        setNow(Date.now() + skew);
      } else {
        window.location.assign("/admin");
      }
    } catch {
      window.location.assign("/admin");
    } finally {
      setStaying(false);
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
          <p className="m-0">{a("timeoutBody", locale, { time: formatRemaining(remaining, locale) })}</p>
          <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-4)]">
            <Button type="button" onClick={() => void stay()} loading={staying} loadingLabel="…">
              {a("staySignedIn", locale)}
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                {a("signOut", locale)}
              </Button>
            </form>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}
