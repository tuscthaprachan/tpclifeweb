import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ConsoleEmailSender,
  EmailError,
  MemoryEmailSender,
  getEmailSender,
  setEmailSenderForTests,
  signInCode,
  staffInvite,
} from "@/lib/email";

const org = { th: "สโมสรนักศึกษา", en: "Student Union" };
const THAI = /[฀-๿]/;

describe("signInCode", () => {
  const mail = signInCode({ code: "123456", expiresInMinutes: 10 });

  it("contains the code in text and html", () => {
    expect(mail.text).toContain("123456");
    expect(mail.html).toContain("123456");
  });

  it("has Thai first, then English, in subject, text and html", () => {
    expect(THAI.test(mail.subject)).toBe(true);
    expect(mail.subject).toContain("sign-in code");
    expect(mail.text.indexOf("รหัสเข้าสู่ระบบ")).toBeLessThan(mail.text.indexOf("Your sign-in code"));
    expect(mail.html).toContain('lang="th"');
    expect(mail.html.indexOf('lang="th"')).toBeLessThan(mail.html.indexOf('lang="en"'));
  });

  it("states the expiry and the ignore instruction in both languages", () => {
    expect(mail.text).toContain("10 นาที");
    expect(mail.text).toContain("10 minutes");
    expect(mail.text).toContain("ignore this email");
    expect(mail.text).toContain("ไม่ได้ขอรหัสนี้");
  });

  it("uses the singular for one minute", () => {
    expect(signInCode({ code: "123456", expiresInMinutes: 1 }).text).toContain("1 minute and");
  });

  it("refuses a code that is not six digits", () => {
    expect(() => signInCode({ code: "12345", expiresInMinutes: 10 })).toThrow();
    expect(() => signInCode({ code: "12345a", expiresInMinutes: 10 })).toThrow();
  });

  it("uses no images", () => {
    expect(mail.html).not.toContain("<img");
  });
});

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

describe("house style", () => {
  it("has no em dashes", () => {
    const all = [
      signInCode({ code: "000000", expiresInMinutes: 10 }),
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
    const mail = signInCode({ code: "123456", expiresInMinutes: 10 });
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

  it("getEmailSender logs instead of sending when EMAIL_LOG_ONLY is 1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_LOG_ONLY", "1");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "a@example.org");
    expect(getEmailSender()).toBeInstanceOf(ConsoleEmailSender);
  });
});
