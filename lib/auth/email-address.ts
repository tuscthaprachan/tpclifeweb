/**
 * The email address is a staff account's identity, named by the invite. There
 * is no domain allowlist: the invite itself is the authorisation, so an
 * address on any domain can be invited. Pure functions, tested without a database.
 */

/** Lower-cases and trims. Does not validate. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A deliberately plain shape check; the invite, not the address, is the proof. */
export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}
