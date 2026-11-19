import { getSiteSettings } from "@/components/layout/site-settings";
import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { esc } from "./layout";
import { ConsoleEmailSender, ResendSender } from "./senders";
import { EmailError, type EmailMessage, type EmailSender } from "./types";

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
    cached = new ResendSender(apiKey, from, { replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined });
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

/**
 * Templates are written with the built-in service name. This swaps in the
 * name set in the admin console, so a rename there reaches every email.
 */
export function applyServiceName(message: EmailMessage, name: LocaleString): EmailMessage {
  const pairs = (["th", "en"] as const).filter((l) => name[l] && name[l] !== UI.serviceName[l]).map((l) => [UI.serviceName[l], name[l]] as const);
  if (pairs.length === 0) return message;
  const swap = (value: string, html: boolean) => pairs.reduce((out, [from, to]) => out.split(html ? esc(from) : from).join(html ? esc(to) : to), value);
  return { ...message, subject: swap(message.subject, false), text: swap(message.text, false), html: swap(message.html, true) };
}

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Sends one message and never throws. Failures are logged as a code and
 * message only, never the recipient or the body. Returns `ok: false` when
 * email is not configured.
 */
export async function sendEmail(message: EmailMessage, opts: { sender?: EmailSender } = {}): Promise<SendEmailResult> {
  try {
    if (!opts.sender && !isEmailConfigured()) {
      console.warn("[email] not sent: not_configured Email is not configured.");
      return { ok: false, error: "not_configured" };
    }
    const sender = opts.sender ?? getEmailSender();
    const named = opts.sender ? message : applyServiceName(message, (await getSiteSettings()).serviceName);
    const { id } = await sender.send(named);
    return { ok: true, id };
  } catch (error) {
    const code = error instanceof EmailError ? error.code : "unknown";
    const reason = error instanceof Error ? error.message : "Unknown error.";
    console.error(`[email] not sent: ${code} ${reason}`);
    return { ok: false, error: code };
  }
}
