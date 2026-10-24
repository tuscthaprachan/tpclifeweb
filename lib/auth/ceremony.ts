/**
 * What the browser tells the passkey registration endpoints when the person
 * has no session yet: which link they hold. Better Auth carries one opaque
 * `context` string from "generate options" to "verify registration"; this is
 * its content. The token inside is checked again, and spent, on the server
 * once the passkey itself has been verified (lib/auth/create.ts).
 */

export type CeremonyContext = { kind: "invite"; token: string; name: string } | { kind: "recover"; token: string };

const TOKEN_MAX = 200;

export function encodeCeremonyContext(context: CeremonyContext): string {
  return JSON.stringify(context.kind === "invite" ? { k: "invite", t: context.token, n: context.name } : { k: "recover", t: context.token });
}

/** The parsed context, or null for anything malformed. Never throws. */
export function parseCeremonyContext(raw: string | null | undefined): CeremonyContext | null {
  if (!raw || raw.length > 1000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const { k, t, n } = value as Record<string, unknown>;
  if (typeof t !== "string" || t.length === 0 || t.length > TOKEN_MAX) return null;
  if (k === "recover") return { kind: "recover", token: t };
  if (k === "invite" && typeof n === "string") return { kind: "invite", token: t, name: n };
  return null;
}
