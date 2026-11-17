import { afterEach, describe, expect, it, vi } from "vitest";

import { EmailError, MemoryEmailSender, ResendSender, sendEmail, type EmailMessage } from "@/lib/email";
import type { ResendClientLike } from "@/lib/email/senders";

const message: EmailMessage = { to: "person@example.org", subject: "Hello", text: "Hi", html: "<p>Hi</p>" };

function sender(send: ResendClientLike["emails"]["send"], replyTo?: string) {
  return new ResendSender("re_key", "TryTPC <no-reply@mail.example.org>", { client: { emails: { send } }, retryDelaysMs: [0, 0], replyTo });
}

afterEach(() => vi.restoreAllMocks());

describe("ResendSender", () => {
  it("passes reply-to, tags and the idempotency key", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "abc" }, error: null });
    const tags = [{ name: "category", value: "staff_invite" }];
    await expect(sender(send).send({ ...message, replyTo: "desk@example.org", tags, idempotencyKey: "key-1" })).resolves.toEqual({ id: "abc" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: "TryTPC <no-reply@mail.example.org>", to: message.to, replyTo: "desk@example.org", tags }), { idempotencyKey: "key-1" });
  });

  it("falls back to the configured reply-to", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "abc" }, error: null });
    await sender(send, "default@example.org").send(message);
    expect(send.mock.calls[0]?.[0].replyTo).toBe("default@example.org");
    expect(send.mock.calls[0]?.[1]).toBeUndefined();
  });

  it("retries on a rate limit and then succeeds", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { name: "rate_limit_exceeded", message: "Slow down", statusCode: 429 } })
      .mockResolvedValueOnce({ data: { id: "ok" }, error: null });
    await expect(sender(send).send(message)).resolves.toEqual({ id: "ok" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("gives up after two retries", async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { name: "internal_server_error", message: "Boom", statusCode: 500 } });
    await expect(sender(send).send(message)).rejects.toThrow(/internal_server_error: Boom/);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("retries network errors", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("socket hang up")).mockResolvedValueOnce({ data: { id: "ok" }, error: null });
    await expect(sender(send).send(message)).resolves.toEqual({ id: "ok" });
  });

  it("does not retry a validation error and includes the provider message", async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { name: "validation_error", message: "Invalid `to` field", statusCode: 422 } });
    const failure = await sender(send).send(message).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(EmailError);
    expect((failure as EmailError).message).toContain("validation_error");
    expect((failure as EmailError).message).toContain("Invalid `to` field");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid recipient without calling the provider", async () => {
    const send = vi.fn();
    await expect(sender(send).send({ ...message, to: "nope" })).rejects.toMatchObject({ code: "invalid_recipient" });
    expect(send).not.toHaveBeenCalled();
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
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("EMAIL_LOG_ONLY", "");
    await expect(sendEmail(message)).resolves.toEqual({ ok: false, error: "not_configured" });
    vi.unstubAllEnvs();
  });
});
