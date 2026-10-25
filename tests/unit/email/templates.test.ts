import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ConsoleEmailSender,
  EmailError,
  MemoryEmailSender,
  getEmailSender,
  setEmailSenderForTests,
  isEmailConfigured,
  staffInvite,
  staffRecovery,
} from "@/lib/email";

const org = { th: "สโมสรนักศึกษา", en: "Student Union" };
const THAI = /[฀-๿]/;

describe("staffInvite", () => {
  const url = "https://example.test/admin/accept?token=abc&x=1";
  const mail = staffInvite({ inviterName: "Somchai", organisation: org, acceptUrl: url, expiresInDays: 7 });

  it("contains the link, inviter and organisation in both languages", () => {
    expect(mail.text).toContain(url);
    expect(mail.text).toContain("Somchai");
    expect(mail.text).toContain("สโมสรนักศึกษา");
    expect(mail.text).toContain("Student Union");
    expect(mail.text).toContain("7 วัน");
    expect(mail.text).toContain("7 days");
    expect(mail.html).toContain('href="https://example.test/admin/accept?token=abc&amp;x=1"');
  });

  it("escapes HTML in the inviter name", () => {
    const m = staffInvite({ inviterName: "<b>x</b>", organisation: org, acceptUrl: url, expiresInDays: 1 });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("&lt;b&gt;");
  });

  it("refuses links that are not http(s)", () => {
    expect(() => staffInvite({ inviterName: "A", organisation: org, acceptUrl: "javascript:alert(1)", expiresInDays: 7 })).toThrow();
    expect(() => staffInvite({ inviterName: "A", organisation: org, acceptUrl: "/relative", expiresInDays: 7 })).toThrow();
  });
});

describe("staffRecovery", () => {
  const url = "https://example.test/admin/recover/abc";
  const mail = staffRecovery({ organisation: org, recoverUrl: url, expiresInHours: 24 });

  it("has the link, Thai first, and says how long it lasts and that it works once", () => {
    expect(mail.text).toContain(url);
    expect(THAI.test(mail.subject)).toBe(true);
    expect(mail.text.indexOf("ลิงก์กู้คืนบัญชี")).toBeLessThan(mail.text.indexOf("account recovery link"));
    expect(mail.text).toContain("24 ชั่วโมง");
    expect(mail.text).toContain("24 hours");
    expect(mail.text).toContain("works once");
  });

  it("refuses links that are not http(s)", () => {
    expect(() => staffRecovery({ organisation: org, recoverUrl: "javascript:alert(1)", expiresInHours: 24 })).toThrow();
  });
});

describe("house style", () => {
  it("has no em dashes", () => {
    const all = [
      staffRecovery({ organisation: org, recoverUrl: "https://example.test/", expiresInHours: 24 }),
      staffInvite({ inviterName: "A", organisation: org, acceptUrl: "https://example.test/", expiresInDays: 7 }),
    ];
    for (const m of all) expect(m.subject + m.text + m.html).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("senders", () => {
  afterEach(() => {
    setEmailSenderForTests(undefined);
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    vi.unstubAllEnvs();
  });

  it("memory sender records messages and validates the recipient", async () => {
    const s = new MemoryEmailSender();
    const mail = staffInvite({ inviterName: "A", organisation: org, acceptUrl: "https://example.test/", expiresInDays: 7 });
    await s.send({ to: "a@example.test", ...mail });
    expect(s.outbox).toHaveLength(1);
    await expect(s.send({ to: "not-an-address", ...mail })).rejects.toBeInstanceOf(EmailError);
  });

  it("getEmailSender falls back to console in development and throws in production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getEmailSender()).toBeInstanceOf(ConsoleEmailSender);
    setEmailSenderForTests(undefined);
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getEmailSender()).toThrow(/not configured/);
  });

  it("isEmailConfigured is true only with Resend keys or log-only mode", () => {
    expect(isEmailConfigured()).toBe(false);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    expect(isEmailConfigured()).toBe(false);
    vi.stubEnv("EMAIL_FROM", "a@example.org");
    expect(isEmailConfigured()).toBe(true);
    vi.unstubAllEnvs();
    vi.stubEnv("EMAIL_LOG_ONLY", "1");
    expect(isEmailConfigured()).toBe(true);
  });

  it("getEmailSender logs instead of sending when EMAIL_LOG_ONLY is 1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_LOG_ONLY", "1");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "a@example.org");
    expect(getEmailSender()).toBeInstanceOf(ConsoleEmailSender);
  });
});
