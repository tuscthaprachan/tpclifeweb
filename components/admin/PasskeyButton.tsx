"use client";

/**
 * The buttons that run a WebAuthn ceremony. WebAuthn only exists in a browser
 * with JavaScript, so these render nothing until the page has hydrated and the
 * browser reports support; the server-rendered page carries a plain note for
 * the case where that never happens.
 *
 * Four uses: sign in (no email, the browser offers the passkeys it holds for
 * this site), add a passkey while signed in, create an account from an invite
 * link, and register a new passkey from a recovery link. The last two carry the
 * link's token to the server, which checks it again and spends it only once the
 * passkey itself has been verified (lib/auth/create.ts).
 */

import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Button, ErrorSummary, NotificationBanner, Stack, TextInput } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { encodeCeremonyContext, type CeremonyContext } from "@/lib/auth/ceremony";
import { a, type AdminKey } from "@/lib/i18n/admin";
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

/** The plain sentence for an error from the passkey endpoints or the browser. */
function failureKey(error: { code?: string | undefined; message?: string | undefined }, fallback: AdminKey): AdminKey {
  switch (error.message) {
    case "link_unusable":
    case "link_required":
      return "passkeyErrLinkUnusable";
    case "too_many_attempts":
      return "passkeyErrTooMany";
    case "name_required":
      return "errNameRequired";
    case "account_exists":
      return "passkeyErrAccountExists";
    case "sign_out_first":
      return "passkeyErrSignOutFirst";
    case "user_verification_required":
      return "passkeyErrVerification";
  }
  if (error.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return "passkeyErrDuplicate";
  if (error.code === "ERROR_CEREMONY_ABORTED" || error.code === "AUTH_CANCELLED") return "passkeyErrCancelled";
  return fallback;
}

type Outcome = { ok: true } | { ok: false; key: AdminKey };

async function register(context: CeremonyContext | null): Promise<Outcome> {
  try {
    const result = await authClient.passkey.addPasskey(context ? { context: encodeCeremonyContext(context), createSession: true } : {});
    if (result?.error) return { ok: false, key: failureKey(result.error, "passkeyCreateFailed") };
    return { ok: true };
  } catch {
    return { ok: false, key: "passkeyCreateFailed" };
  }
}

function Failure({ locale, messageKey }: { locale: Locale; messageKey: AdminKey }) {
  return (
    <NotificationBanner variant="warning" title={UI.errorTitle[locale]}>
      {a(messageKey, locale)}
    </NotificationBanner>
  );
}

/** "Sign in with a passkey". Discoverable, so no email is typed. A full load afterwards, so the header sees the session. */
export function SignInWithPasskey({ locale, next }: { locale: Locale; next: string }) {
  const supported = useWebAuthnSupport();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!supported) return null;

  async function run() {
    setBusy(true);
    setFailed(false);
    try {
      const result = await authClient.signIn.passkey();
      if (result?.error) {
        setFailed(true);
        return;
      }
      window.location.assign(next);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack space={4}>
      {failed ? <Failure locale={locale} messageKey="signInFailed" /> : null}
      <div>
        <Button type="button" onClick={() => void run()} loading={busy} loadingLabel={a("signInButton", locale)}>
          {a("signInButton", locale)}
        </Button>
      </div>
    </Stack>
  );
}

/** Adds a passkey to the signed-in person's own account. */
export function AddPasskeyButton({ locale }: { locale: Locale }) {
  const supported = useWebAuthnSupport();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AdminKey | null>(null);
  if (!supported) return null;

  async function run() {
    setBusy(true);
    setFailure(null);
    const outcome = await register(null);
    setBusy(false);
    if (outcome.ok) window.location.assign("/admin/security?notice=added");
    else setFailure(outcome.key);
  }

  return (
    <Stack space={4}>
      {failure ? <Failure locale={locale} messageKey={failure} /> : null}
      <div>
        <Button type="button" onClick={() => void run()} loading={busy} loadingLabel={a("addPasskeyButton", locale)}>
          {a("addPasskeyButton", locale)}
        </Button>
      </div>
    </Stack>
  );
}

/** The invite page: asks for a name, then creates the account by registering a passkey. */
export function CreateAccountForm({ locale, token }: { locale: Locale; token: string }) {
  const supported = useWebAuthnSupport();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AdminKey | null>(null);
  if (!supported) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      setNameError(a("errNameRequired", locale));
      return;
    }
    setNameError(undefined);
    setBusy(true);
    const outcome = await register({ kind: "invite", token, name: trimmed });
    setBusy(false);
    if (outcome.ok) window.location.assign("/admin");
    else setFailure(outcome.key);
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate>
      <Stack space={6}>
        {nameError ? <ErrorSummary title={UI.errorSummaryTitle[locale]} headingLevel={2} items={[{ href: "#admin-invite-name", message: nameError }]} /> : null}
        {failure ? <Failure locale={locale} messageKey={failure} /> : null}
        <TextInput
          id="admin-invite-name"
          name="name"
          label={a("inviteNameLabel", locale)}
          hint={a("inviteNameHint", locale)}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError}
          autoComplete="name"
          maxLength={100}
          className="max-w-[28rem]"
        />
        <div>
          <Button type="submit" loading={busy} loadingLabel={a("inviteCreateButton", locale)}>
            {a("inviteCreateButton", locale)}
          </Button>
        </div>
      </Stack>
    </form>
  );
}

/** The recovery page: registers a new passkey on the existing account. */
export function RecoverButton({ locale, token }: { locale: Locale; token: string }) {
  const supported = useWebAuthnSupport();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AdminKey | null>(null);
  if (!supported) return null;

  async function run() {
    setBusy(true);
    setFailure(null);
    const outcome = await register({ kind: "recover", token });
    setBusy(false);
    if (outcome.ok) window.location.assign("/admin/security?notice=recovered");
    else setFailure(outcome.key);
  }

  return (
    <Stack space={4}>
      {failure ? <Failure locale={locale} messageKey={failure} /> : null}
      <div>
        <Button type="button" onClick={() => void run()} loading={busy} loadingLabel={a("recoverButton", locale)}>
          {a("recoverButton", locale)}
        </Button>
      </div>
    </Stack>
  );
}
