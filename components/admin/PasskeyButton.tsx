"use client";

/**
 * Passkey buttons. WebAuthn only exists in a browser with JavaScript, so these
 * render nothing until the page has hydrated and the browser reports support;
 * the server-rendered page already offers the authenticator app and backup
 * codes as the way that works without it.
 */

import { useState, useSyncExternalStore } from "react";
import { Button, NotificationBanner } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

const noop = () => () => {};

/** True only in a browser that can do WebAuthn. False on the server and before hydration. */
export function useWebAuthnSupport(): boolean {
  return useSyncExternalStore(
    noop,
    () => typeof window.PublicKeyCredential !== "undefined",
    () => false,
  );
}

interface PasskeyButtonProps {
  locale: Locale;
  mode: "register" | "sign-in";
  label: string;
}

export function PasskeyButton({ locale, mode, label }: PasskeyButtonProps) {
  const supported = useWebAuthnSupport();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!supported) return null;

  async function run() {
    setBusy(true);
    setFailed(false);
    try {
      const result = mode === "register" ? await authClient.passkey.addPasskey() : await authClient.signIn.passkey();
      if (result?.error) {
        setFailed(true);
        return;
      }
      // A full load, so the page and the header see the updated session.
      window.location.assign("/admin");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {failed ? (
        <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
          {mode === "register" ? a("passkeyCreateFailed", locale) : a("passkeyFailed", locale)}
        </NotificationBanner>
      ) : null}
      <div>
        <Button type="button" onClick={() => void run()} loading={busy} loadingLabel={label}>
          {label}
        </Button>
      </div>
    </div>
  );
}
