import { Resend } from "resend";

import { EmailError, type EmailMessage, type EmailSender } from "./types";

const ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function assertRecipient(to: string): void {
  if (!ADDRESS.test(to)) throw new EmailError("invalid_recipient", "Recipient is not a valid email address.");
}

type SendResult = {
  data: { id: string } | null;
  error: { message: string; name?: string; statusCode?: number | null } | null;
};

/** The part of the Resend client that `ResendSender` uses; tests pass their own. */
export interface ResendClientLike {
  emails: { send(payload: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<SendResult> };
}

export interface ResendSenderOptions {
  replyTo?: string;
  client?: ResendClientLike;
  /** Waits before each retry. Defaults to 500 ms then 1500 ms. */
  retryDelaysMs?: number[];
}

const NO_RETRY = new Set(["daily_quota_exceeded", "monthly_quota_exceeded"]);

function isRetryable(error: NonNullable<SendResult["error"]>): boolean {
  if (error.name && NO_RETRY.has(error.name)) return false;
  if (error.name === "rate_limit_exceeded" || error.name === "internal_server_error" || error.name === "application_error") return true;
  const status = error.statusCode;
  return status === 429 || (typeof status === "number" && status >= 500);
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ResendSender implements EmailSender {
  private readonly client: ResendClientLike;
  private readonly replyTo?: string;
  private readonly retryDelaysMs: number[];

  constructor(
    apiKey: string,
    private readonly from: string,
    options: ResendSenderOptions = {},
  ) {
    this.client = options.client ?? (new Resend(apiKey) as unknown as ResendClientLike);
    this.replyTo = options.replyTo;
    this.retryDelaysMs = options.retryDelaysMs ?? [500, 1500];
  }

  async send(message: EmailMessage): Promise<{ id: string }> {
    assertRecipient(message.to);
    const payload: Record<string, unknown> = {
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };
    const replyTo = message.replyTo ?? this.replyTo;
    if (replyTo) payload.replyTo = replyTo;
    if (message.tags?.length) payload.tags = message.tags;
    const options = message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined;

    let failure = "Email provider returned no result.";
    for (let attempt = 0; ; attempt += 1) {
      let retryable = true;
      try {
        const { data, error } = await this.client.emails.send(payload, options);
        if (!error && data) return { id: data.id };
        if (error) {
          failure = error.name ? `${error.name}: ${error.message}` : error.message;
          retryable = isRetryable(error);
        }
      } catch (thrown) {
        failure = thrown instanceof Error ? `network_error: ${thrown.message}` : "network_error";
      }
      const delay = this.retryDelaysMs[attempt];
      if (!retryable || delay === undefined) throw new EmailError("backend", failure);
      await wait(delay);
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
