/** One message ready to send. Templates produce `subject`, `text` and `html`. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailSender {
  /** Resolves with the provider's message id. Rejects with `EmailError` on failure. */
  send(message: EmailMessage): Promise<{ id: string }>;
}

export class EmailError extends Error {
  constructor(
    readonly code: "not_configured" | "invalid_recipient" | "backend",
    message: string,
  ) {
    super(message);
    this.name = "EmailError";
  }
}
