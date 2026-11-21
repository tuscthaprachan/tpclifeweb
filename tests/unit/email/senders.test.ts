import { afterEach, describe, expect, it, vi } from "vitest";

import { EmailError, MemoryEmailSender, SmtpSender, sendEmail, smtpConfigFromEnv, type EmailMessage } from "@/lib/email";
import type { SmtpTransportLike } from "@/lib/email/senders";

const message: EmailMessage = { to: "person@example.org", subject: "Hello", text: "Hi", html: "<p>Hi</p>" };
const FROM = "TryTPC <no-reply@trytpc.example.org>";

function sender(sendMail: SmtpTransportLike["sendMail"], replyTo?: string) {
  return new SmtpSender({ host: "localhost", port: 587, secure: false }, FROM, { transport: { sendMail }, retryDelaysMs: [0, 0], replyTo });
}

/** An error shaped like the ones nodemailer throws. */
function smtpError(message: string, fields: { code?: string; responseCode?: number }) {
  return Object.assign(new Error(message), fields);
}

afterEach(() => vi.restoreAllMocks());

describe("SmtpSender", () => {
  it("sends from the configured address with the message reply-to", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "<abc@trytpc>" });
    await expect(sender(sendMail).send({ ...message, replyTo: "desk@example.org" })).resolves.toEqual({ id: "<abc@trytpc>" });
    expect(sendMail).toHaveBeenCalledWith({ from: FROM, to: message.to, subject: "Hello", text: "Hi", html: "<p>Hi</p>", replyTo: "desk@example.org" });
  });

  it("falls back to the configured reply-to, and sends none when there is none", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "1" });
    await sender(sendMail, "default@example.org").send(message);
    expect(sendMail.mock.calls[0]?.[0].replyTo).toBe("default@example.org");
    await sender(sendMail).send(message);
    expect(sendMail.mock.calls[1]?.[0]).not.toHaveProperty("replyTo");
  });

  it("retries a temporary 4xx reply and then succeeds", async () => {
    const sendMail = vi.fn().mockRejectedValueOnce(smtpError("Try again later", { code: "EENVELOPE", responseCode: 451 })).mockResolvedValueOnce({ messageId: "ok" });
    await expect(sender(sendMail).send(message)).resolves.toEqual({ id: "ok" });
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("retries a dropped connection", async () => {
    const sendMail = vi.fn().mockRejectedValueOnce(smtpError("Connection closed", { code: "ECONNECTION" })).mockResolvedValueOnce({ messageId: "ok" });
    await expect(sender(sendMail).send(message)).resolves.toEqual({ id: "ok" });
  });

  it("gives up after two retries", async () => {
    const sendMail = vi.fn().mockRejectedValue(smtpError("Timed out", { code: "ETIMEDOUT" }));
    await expect(sender(sendMail).send(message)).rejects.toThrow(/etimedout: Timed out/);
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it("does not retry a permanent 5xx reply and includes the server's message", async () => {
    const sendMail = vi.fn().mockRejectedValue(smtpError("Recipient address rejected", { code: "EENVELOPE", responseCode: 550 }));
    const failure = await sender(sendMail).send(message).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(EmailError);
    expect((failure as EmailError).message).toBe("smtp_550: Recipient address rejected");
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("does not retry a failed login", async () => {
    const sendMail = vi.fn().mockRejectedValue(smtpError("Invalid login", { code: "EAUTH", responseCode: 535 }));
    await expect(sender(sendMail).send(message)).rejects.toMatchObject({ code: "backend" });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid recipient without contacting the server", async () => {
    const sendMail = vi.fn();
    await expect(sender(sendMail).send({ ...message, to: "nope" })).rejects.toMatchObject({ code: "invalid_recipient" });
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("smtpConfigFromEnv", () => {
  it("is null without a host", () => {
    expect(smtpConfigFromEnv({})).toBeNull();
    expect(smtpConfigFromEnv({ SMTP_HOST: "  " })).toBeNull();
  });

  it("defaults to port 587 with STARTTLS and no login", () => {
    expect(smtpConfigFromEnv({ SMTP_HOST: "localhost" })).toEqual({ host: "localhost", port: 587, secure: false, user: undefined, password: undefined });
  });

  it("uses implicit TLS on port 465 unless told otherwise", () => {
    expect(smtpConfigFromEnv({ SMTP_HOST: "mail.example.org", SMTP_PORT: "465" })?.secure).toBe(true);
    expect(smtpConfigFromEnv({ SMTP_HOST: "mail.example.org", SMTP_PORT: "465", SMTP_SECURE: "false" })?.secure).toBe(false);
    expect(smtpConfigFromEnv({ SMTP_HOST: "mail.example.org", SMTP_SECURE: "true" })?.secure).toBe(true);
  });

  it("reads the mailbox login", () => {
    expect(smtpConfigFromEnv({ SMTP_HOST: "localhost", SMTP_USER: "no-reply@example.org", SMTP_PASSWORD: "pw" })).toMatchObject({ user: "no-reply@example.org", password: "pw" });
  });

  it("falls back to 587 for a nonsense port", () => {
    expect(smtpConfigFromEnv({ SMTP_HOST: "localhost", SMTP_PORT: "abc" })?.port).toBe(587);
  });
});

describe("sendEmail", () => {
  it("returns the id on success", async () => {
    const memory = new MemoryEmailSender();
    await expect(sendEmail(message, { sender: memory })).resolves.toEqual({ ok: true, id: "memory-1" });
  });

  it("never throws and never logs the recipient", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = { send: async () => { throw new EmailError("backend", "validation_error: bad"); } };
    await expect(sendEmail(message, { sender: failing })).resolves.toEqual({ ok: false, error: "backend" });
    const logged = log.mock.calls.flat().join(" ");
    expect(logged).toContain("[email] not sent: backend validation_error: bad");
    expect(logged).not.toContain(message.to);
  });

  it("returns not ok when email is not configured", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("EMAIL_LOG_ONLY", "");
    await expect(sendEmail(message)).resolves.toEqual({ ok: false, error: "not_configured" });
    vi.unstubAllEnvs();
  });
});
