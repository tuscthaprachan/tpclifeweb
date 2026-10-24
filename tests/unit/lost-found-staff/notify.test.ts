import { beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryEmailSender } from "@/lib/email";
import { lostReportPossibleMatch, lostReportReadyToCollect, lostReportReturned } from "@/lib/email/lost-found-templates";
import { decideReporterNotice, notifyLostReporter } from "@/lib/lost-found/notify";
import { lfSetup } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

describe("decideReporterNotice", () => {
  const ok = { hasContact: true, hasEmail: true, consentContact: true, emailConfigured: true };
  it("emails only with an address, consent and email set up", () => {
    expect(decideReporterNotice(ok)).toEqual({ action: "email" });
  });
  it("reminds the officer otherwise, naming the reason", () => {
    expect(decideReporterNotice({ ...ok, hasContact: false })).toEqual({ action: "remind", reason: "no_contact" });
    expect(decideReporterNotice({ ...ok, consentContact: false })).toEqual({ action: "remind", reason: "no_consent" });
    expect(decideReporterNotice({ ...ok, hasEmail: false })).toEqual({ action: "remind", reason: "no_email" });
    expect(decideReporterNotice({ ...ok, emailConfigured: false })).toEqual({ action: "remind", reason: "email_not_configured" });
  });
  it("never emails without consent, even if everything else is there", () => {
    expect(decideReporterNotice({ ...ok, consentContact: false }).action).toBe("remind");
  });
});

describe("notifyLostReporter", () => {
  it("sends the bilingual email, logs the contact read and notes it on the case", async () => {
    const lost = await t.lostReport(t.officer, {}, { email: "somchai@example.test" });
    const sender = new MemoryEmailSender();
    const outcome = await notifyLostReporter(t.db, lost.caseId, "possible_match", t.officer, { sender, emailConfigured: true, deskOrganisationId: t.orgId("tusu") });
    expect(outcome).toEqual({ result: "sent" });
    expect(sender.outbox).toHaveLength(1);
    const mail = sender.outbox[0]!;
    expect(mail.to).toBe("somchai@example.test");
    expect(mail.text).toContain(lost.reference);
    expect(mail.text).toContain("เราอาจพบ");
    expect(mail.text).toContain("We may have found");
    // The contact was decrypted through the logged read, and the send is noted.
    const events = await t.events(lost.caseId);
    expect(events.filter((e) => e.type === "contact_viewed")).toHaveLength(1);
    expect(events.filter((e) => e.type === "internal_note").at(-1)!.body).toContain("Emailed the reporter");
    expect(JSON.stringify(events)).not.toContain("somchai@example.test");
  });

  it("sends nothing and asks for a manual contact without consent, email, or configuration", async () => {
    const sender = new MemoryEmailSender();
    const noConsent = await t.lostReport(t.officer, {}, { consentContact: false });
    expect(await notifyLostReporter(t.db, noConsent.caseId, "returned", t.officer, { sender, emailConfigured: true })).toEqual({ result: "remind", reason: "no_consent", preferred: "email" });
    const noEmail = await t.lostReport(t.officer, {}, { email: null, preferredContact: "phone" });
    expect(await notifyLostReporter(t.db, noEmail.caseId, "returned", t.officer, { sender, emailConfigured: true })).toEqual({ result: "remind", reason: "no_email", preferred: "phone" });
    const fine = await t.lostReport();
    expect(await notifyLostReporter(t.db, fine.caseId, "returned", t.officer, { sender, emailConfigured: false })).toMatchObject({ result: "remind", reason: "email_not_configured" });
    expect(sender.outbox).toHaveLength(0);
    // Nothing was decrypted, so no contact view was logged.
    for (const c of [noConsent, noEmail, fine]) expect((await t.events(c.caseId)).some((e) => e.type === "contact_viewed")).toBe(false);
  });

  it("turns a failed send into a reminder instead of an error", async () => {
    const lost = await t.lostReport();
    const failing = { send: vi.fn().mockRejectedValue(new Error("provider down")) };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const outcome = await notifyLostReporter(t.db, lost.caseId, "ready_to_collect", t.officer, { sender: failing, emailConfigured: true });
    quiet.mockRestore();
    expect(outcome).toMatchObject({ result: "remind", reason: "send_failed" });
    expect((await t.events(lost.caseId)).filter((e) => e.type === "internal_note").at(-1)!.body).toContain("Could not email");
  });

  it("is refused for staff outside the service", async () => {
    const lost = await t.lostReport();
    await expect(notifyLostReporter(t.db, lost.caseId, "returned", t.complaints, { emailConfigured: true })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("lost report email templates", () => {
  const params = { reference: "LF-2026-0007", desk: { th: "สโมสรนักศึกษา", en: "Student Union" } };
  const all = [lostReportPossibleMatch(params), lostReportReadyToCollect(params), lostReportReturned(params)];

  it("carry the reference and both languages, Thai first", () => {
    for (const mail of all) {
      expect(mail.subject).toContain("LF-2026-0007");
      expect(mail.text).toContain("LF-2026-0007");
      expect(mail.text.search(/[\u0E00-\u0E7F]/)).toBeLessThan(mail.text.search(/[A-Za-z]{4}/));
      expect(mail.html).toContain('lang="th"');
      expect(mail.html).toContain('lang="en"');
      expect(mail.html.indexOf('lang="th"')).toBeLessThan(mail.html.lastIndexOf('lang="en"'));
    }
  });

  it("name the desk, ask for photo ID but never for a number, and use no em dash", () => {
    expect(all[0]!.text).toContain("Student Union");
    expect(all[1]!.text).toContain("photo ID");
    expect(all[1]!.text).toContain("will not write down the number");
    for (const mail of all) expect(mail.subject + mail.text + mail.html).not.toContain(String.fromCharCode(8212));
  });

  it("escape anything put in them", () => {
    const mail = lostReportReturned({ reference: "<b>x</b>" });
    expect(mail.html).not.toContain("<b>x</b>");
    expect(mail.html).toContain("&lt;b&gt;");
  });
});
