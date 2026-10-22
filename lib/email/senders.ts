import { Resend } from "resend";

import { EmailError, type EmailMessage, type EmailSender } from "./types";

const ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function assertRecipient(to: string): void {
  if (!ADDRESS.test(to)) throw new EmailError("invalid_recipient", "Recipient is not a valid email address.");
}

export class ResendSender implements EmailSender {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<{ id: string }> {
    assertRecipient(message.to);
    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    if (error || !data) throw new EmailError("backend", error?.message ?? "Email provider returned no result.");
    return { id: data.id };
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
