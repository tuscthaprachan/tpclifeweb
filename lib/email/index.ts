import { ConsoleEmailSender, ResendSender } from "./senders";
import { EmailError, type EmailSender } from "./types";

export * from "./types";
export * from "./templates";
export { ConsoleEmailSender, MemoryEmailSender, ResendSender } from "./senders";

let cached: EmailSender | undefined;

/**
 * True when a real or log-only sender is set up. Staff sign-in does not depend
 * on email: invite and recovery links are shown on screen, and are also sent
 * when this is true.
 */
export function isEmailConfigured(): boolean {
  return process.env.EMAIL_LOG_ONLY === "1" || Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Picks the sender from the environment, on first use.
 *
 * `RESEND_API_KEY` and `EMAIL_FROM` together select Resend. Missing either, a
 * production build throws `not_configured` when called (never at import, so
 * the site still builds); development falls back to printing to the console.
 *
 * `EMAIL_LOG_ONLY=1` forces the console sender, in production too. Links then
 * appear in the server logs, so remove it once email works.
 */
export function getEmailSender(): EmailSender {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (process.env.EMAIL_LOG_ONLY === "1") {
    cached = new ConsoleEmailSender();
  } else if (apiKey && from) {
    cached = new ResendSender(apiKey, from);
  } else if (process.env.NODE_ENV === "production") {
    throw new EmailError("not_configured", "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  } else {
    cached = new ConsoleEmailSender();
  }
  return cached;
}

/** Tests only: replace or clear the cached sender. */
export function setEmailSenderForTests(sender: EmailSender | undefined): void {
  cached = sender;
}
