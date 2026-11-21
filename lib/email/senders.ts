import { EmailError, type EmailMessage, type EmailSender } from "./types";

const ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function assertRecipient(to: string): void {
  if (!ADDRESS.test(to)) throw new EmailError("invalid_recipient", "Recipient is not a valid email address.");
}

/** What `SmtpSender` passes to the transport; tests pass their own transport. */
export interface SmtpMail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/** The part of a nodemailer transport that `SmtpSender` uses. */
export interface SmtpTransportLike {
  sendMail(mail: SmtpMail): Promise<{ messageId: string }>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  /** Implicit TLS (port 465). Otherwise STARTTLS is used when the server offers it. */
  secure: boolean;
  /** Both or neither. Plesk needs a mailbox login to send from outside localhost. */
  user?: string;
  password?: string;
}

export interface SmtpSenderOptions {
  replyTo?: string;
  transport?: SmtpTransportLike;
  /** Waits before each retry. Defaults to 500 ms then 1500 ms. */
  retryDelaysMs?: number[];
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Network failures nodemailer reports by code. Worth another try. */
const TRANSIENT_CODES = new Set(["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNRESET", "ECONNREFUSED"]);

interface SmtpFailure {
  code?: string;
  responseCode?: number;
  message?: string;
}

/** SMTP 4xx replies are temporary by definition; 5xx are final (bad address, refused, auth). */
function isRetryable(error: SmtpFailure): boolean {
  if (typeof error.responseCode === "number") return error.responseCode >= 400 && error.responseCode < 500;
  return error.code ? TRANSIENT_CODES.has(error.code) : false;
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return "smtp_error";
  const e = error as Error & SmtpFailure;
  const prefix = e.responseCode ? `smtp_${e.responseCode}` : e.code ? e.code.toLowerCase() : "smtp_error";
  // A failed connect to a dual-stack name (localhost) is an AggregateError with an empty message.
  const inner = (error as Error & { errors?: unknown[] }).errors;
  const detail = e.message || (Array.isArray(inner) ? inner.map((x) => (x instanceof Error ? x.message : String(x))).join("; ") : "") || "no detail";
  return `${prefix}: ${detail}`;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Builds the nodemailer transport. Imported lazily so nothing connects at import. */
async function createSmtpTransport(config: SmtpConfig): Promise<SmtpTransportLike> {
  const { createTransport } = await import("nodemailer");
  return createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.password ?? "" } : undefined,
    // Mail to the server's own MTA never leaves the machine, and Plesk's mail service may carry a
    // certificate for another name. Anywhere else, the certificate must be valid.
    tls: LOOPBACK.has(config.host) ? { rejectUnauthorized: false } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

/**
 * Sends through an SMTP server: on Plesk, the domain's own mail service, which
 * signs with the domain's DKIM key and sends from an address SPF allows.
 */
export class SmtpSender implements EmailSender {
  private transport: Promise<SmtpTransportLike> | undefined;
  private readonly replyTo?: string;
  private readonly retryDelaysMs: number[];

  constructor(
    private readonly config: SmtpConfig,
    private readonly from: string,
    options: SmtpSenderOptions = {},
  ) {
    if (options.transport) this.transport = Promise.resolve(options.transport);
    this.replyTo = options.replyTo;
    this.retryDelaysMs = options.retryDelaysMs ?? [500, 1500];
  }

  private getTransport(): Promise<SmtpTransportLike> {
    this.transport ??= createSmtpTransport(this.config);
    return this.transport;
  }

  async send(message: EmailMessage): Promise<{ id: string }> {
    assertRecipient(message.to);
    const mail: SmtpMail = { from: this.from, to: message.to, subject: message.subject, text: message.text, html: message.html };
    const replyTo = message.replyTo ?? this.replyTo;
    if (replyTo) mail.replyTo = replyTo;

    const transport = await this.getTransport();
    for (let attempt = 0; ; attempt += 1) {
      try {
        const { messageId } = await transport.sendMail(mail);
        return { id: messageId };
      } catch (error) {
        const delay = this.retryDelaysMs[attempt];
        if (!isRetryable(error as SmtpFailure) || delay === undefined) throw new EmailError("backend", describe(error));
        await wait(delay);
      }
    }
  }
}

/** Keeps sent messages in `outbox`. For tests. */
export class MemoryEmailSender implements EmailSender {
  readonly outbox: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<{ id: string }> {
    assertRecipient(message.to);
    this.outbox.push(message);
    return { id: `memory-${this.outbox.length}` };
  }
}

/** Prints the plain text version to the server console. For local development only. */
export class ConsoleEmailSender implements EmailSender {
  private count = 0;

  async send(message: EmailMessage): Promise<{ id: string }> {
    assertRecipient(message.to);
    this.count += 1;
    console.info(`\n[email] To: ${message.to}\n[email] Subject: ${message.subject}\n\n${message.text}\n`);
    return { id: `console-${this.count}` };
  }
}
