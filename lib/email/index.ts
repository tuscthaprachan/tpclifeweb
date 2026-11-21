import { getSiteSettings } from "@/components/layout/site-settings";
import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { esc } from "./layout";
import { ConsoleEmailSender, ResendSender, SmtpSender, type SmtpConfig } from "./senders";
import { EmailError, type EmailMessage, type EmailSender } from "./types";

export * from "./types";
export * from "./templates";
export { ConsoleEmailSender, MemoryEmailSender, ResendSender, SmtpSender } from "./senders";

let cached: EmailSender | undefined;

/**
 * The SMTP settings from the environment, or null when `SMTP_HOST` is unset.
 * `SMTP_PORT` defaults to 587 (submission, STARTTLS); port 465 means implicit
 * TLS unless `SMTP_SECURE` says otherwise. `SMTP_USER` and `SMTP_PASSWORD` are
 * the login of the sending mailbox.
 */
export function smtpConfigFromEnv(env: Record<string, string | undefined> = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = Number(env.SMTP_PORT?.trim() || 587);
  const secureRaw = env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureRaw ? secureRaw === "1" || secureRaw === "true" : port === 465;
  const user = env.SMTP_USER?.trim() || undefined;
  return { host, port: Number.isInteger(port) && port > 0 ? port : 587, secure, user, password: user ? env.SMTP_PASSWORD ?? "" : undefined };
}

/**
 * True when a real or log-only sender is set up. Staff sign-in does not depend
 * on email: invite and recovery links are shown on screen, and are also sent
 * when this is true.
 */
export function isEmailConfigured(): boolean {
  if (process.env.EMAIL_LOG_ONLY === "1") return true;
  return Boolean((process.env.RESEND_API_KEY?.trim() || smtpConfigFromEnv()) && process.env.EMAIL_FROM?.trim());
}

/**
 * Picks the sender from the environment, on first use.
 *
 * `RESEND_API_KEY` and `EMAIL_FROM` select Resend (HTTPS API). Otherwise
 * `SMTP_HOST` and `EMAIL_FROM` select SMTP. Resend wins when both are set:
 * the production network blocks outbound SMTP, so the Plesk mail service
 * cannot deliver. Missing a sender or `EMAIL_FROM`, a production build
 * throws `not_configured` when called (never at import, so the site still
 * builds); development falls back to printing to the console.
 *
 * `EMAIL_LOG_ONLY=1` forces the console sender, in production too. Links then
 * appear in the server logs, so remove it once email works.
 */
export function getEmailSender(): EmailSender {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const smtp = smtpConfigFromEnv();
  const from = process.env.EMAIL_FROM?.trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  if (process.env.EMAIL_LOG_ONLY === "1") {
    cached = new ConsoleEmailSender();
  } else if (apiKey && from) {
    cached = new ResendSender(apiKey, from, { replyTo });
  } else if (smtp && from) {
    cached = new SmtpSender(smtp, from, { replyTo });
  } else if (process.env.NODE_ENV === "production") {
    throw new EmailError("not_configured", "Email is not configured. Set RESEND_API_KEY (or SMTP_HOST) and EMAIL_FROM.");
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
