/**
 * Which email domains may sign in without an invitation. Pure functions, so
 * the policy is tested without a database. Staff invites bypass this on
 * purpose: the invite itself is the authorisation (lib/auth/invites.ts).
 */

export const DEFAULT_ALLOWED_EMAIL_DOMAINS = ["dome.tu.ac.th", "tu.ac.th"] as const;

/** Lower-cases and trims. Does not validate. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A deliberately plain shape check; real ownership is proved by the emailed code. */
export function isPlausibleEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

/** The part after the last "@", lower-cased, or "" when there is none. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

/**
 * Parses `AUTH_ALLOWED_EMAIL_DOMAINS` (comma separated). Empty or unset falls
 * back to the Thammasat defaults. Entries are matched exactly: listing
 * `tu.ac.th` does not admit `evil.tu.ac.th`, and `evil-tu.ac.th` never matches.
 */
export function parseAllowedDomains(raw: string | undefined): string[] {
  const list = (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return list.length > 0 ? list : [...DEFAULT_ALLOWED_EMAIL_DOMAINS];
}

export function getAllowedDomains(): string[] {
  return parseAllowedDomains(process.env.AUTH_ALLOWED_EMAIL_DOMAINS);
}

/** True when the address is well formed and its domain is on the list. */
export function isAllowedEmailDomain(email: string, allowed: readonly string[] = getAllowedDomains()): boolean {
  const normal = normaliseEmail(email);
  if (!isPlausibleEmail(normal)) return false;
  return allowed.includes(emailDomain(normal));
}
