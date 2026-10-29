/** Tracking a loan request from the public side, cancelling it, and the tracking-link email. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { transition } from "@/lib/cases";
import { findShortfalls } from "@/lib/borrowing/availability";
import { cases } from "@/lib/db/schema";
import { cancelTracked, lookupTracked, openTracked, parseTrackingInput, trackingLinkUrl } from "@/lib/borrowing/public/track";
import { borrowingTrackingLink } from "@/lib/email/borrowing-templates";
import { at, NOW, setupBorrowing, type Ctx } from "./helpers";

let t: Ctx;
beforeAll(async () => {
  t = await setupBorrowing();
});

const ip = "203.0.113.20";

describe("parseTrackingInput", () => {
  const token = "a".repeat(43);

  it("reads a reference and a pasted link, or the bare code", () => {
    expect(parseTrackingInput(" br-2026-0007 ", `https://example.test/th/borrow/track/link?ref=BR-2026-0007&t=${token}`)).toEqual({ reference: "BR-2026-0007", token });
    expect(parseTrackingInput("BR-2026-0007", token)).toEqual({ reference: "BR-2026-0007", token });
  });

  it("refuses a reference from another service and anything unusable", () => {
    expect(parseTrackingInput("CP-2026-0007", token)).toBeNull();
    expect(parseTrackingInput("BR-2026", token)).toBeNull();
    expect(parseTrackingInput("BR-2026-0007", "short")).toBeNull();
    expect(parseTrackingInput("BR-2026-0007", "")).toBeNull();
  });

  it("builds the private link on the borrowing route", () => {
    expect(trackingLinkUrl("th", "BR-2026-0007", token, "https://trytpc.example")).toBe(`https://trytpc.example/th/borrow/track/link?ref=BR-2026-0007&t=${token}`);
  });
});

describe("opening and cancelling", () => {
  it("shows the status, period and items to the person holding the link, and nothing to anyone else", async () => {
    const made = await t.request();
    const view = await openTracked(t.db, made.reference, made.token, ip, NOW);
    expect(view.state).toBe("ok");
    if (view.state !== "ok") return;
    expect(view.loan.view.status).toBe("requested");
    expect(view.loan.collectAt).toEqual(at("2026-03-12", "10:00"));
    expect(view.loan.returnDueAt).toEqual(at("2026-03-13", "16:00"));
    expect(view.loan.lines).toEqual([{ name: { th: "ลูกฟุตบอล", en: "Football" }, unit: { th: "ลูก", en: "ball" }, quantity: 2 }]);
    expect(view.loan.canCancel).toBe(true);
    expect(view.loan.view.timeline.length).toBeGreaterThan(0);

    expect(await openTracked(t.db, made.reference, "b".repeat(43), ip, NOW)).toEqual({ state: "none" });
    expect(await openTracked(t.db, "BR-2026-9999", made.token, ip, NOW)).toEqual({ state: "none" });
  });

  it("does not open a link that belongs to another service", async () => {
    const { setupComplaints } = await import("../complaints/helpers");
    const other = await setupComplaints();
    const complaint = await other.file();
    expect((await lookupTracked(other.db, complaint.reference, complaint.token, ip, NOW)).state).toBe("none");
  });

  it("limits attempts per address", async () => {
    const made = await t.request({ collectAt: at("2026-03-16"), returnDueAt: at("2026-03-17") });
    const results = [];
    for (let i = 0; i < 40; i++) results.push((await lookupTracked(t.db, made.reference, "c".repeat(43), "198.51.100.99", NOW)).state);
    expect(results).toContain("limited");
  });

  it("cancels a request that has not been collected, which gives the stock back", async () => {
    const football = await t.item("football");
    const made = await t.request({ collectAt: at("2026-03-23"), returnDueAt: at("2026-03-24"), lines: [{ itemId: football.id, quantity: 4 }] });
    expect(await findShortfalls(t.db, [{ itemId: football.id, quantity: 1 }], at("2026-03-23"), at("2026-03-24"), { now: NOW })).toHaveLength(1);

    expect(await cancelTracked(t.db, made.reference, "d".repeat(43), { ip }, NOW)).toBe("none");
    expect(await cancelTracked(t.db, made.reference, made.token, { ip }, NOW)).toBe("done");
    const [row] = await t.db.select().from(cases).where(eq(cases.id, made.caseId));
    expect(row!.status).toBe("cancelled");
    expect(await findShortfalls(t.db, [{ itemId: football.id, quantity: 4 }], at("2026-03-23"), at("2026-03-24"), { now: NOW })).toEqual([]);

    const view = await openTracked(t.db, made.reference, made.token, ip, NOW);
    expect(view.state === "ok" && view.loan.canCancel).toBe(false);
    expect(await cancelTracked(t.db, made.reference, made.token, { ip }, NOW)).toBe("not_allowed");
  });

  it("can cancel an approved request but not one that is on loan", async () => {
    const approved = await t.request({ collectAt: at("2026-03-30"), returnDueAt: at("2026-03-31") });
    await transition(t.db, approved.caseId, "approved", t.officer, { now: NOW });
    const seen = await openTracked(t.db, approved.reference, approved.token, ip, NOW);
    expect(seen.state === "ok" && seen.loan.canCancel).toBe(true);
    expect(await cancelTracked(t.db, approved.reference, approved.token, { ip }, NOW)).toBe("done");

    const out = await t.request({ collectAt: at("2026-04-06"), returnDueAt: at("2026-04-07") });
    await transition(t.db, out.caseId, "approved", t.officer, { now: NOW });
    await transition(t.db, out.caseId, "on_loan", t.officer, { now: NOW });
    const view = await openTracked(t.db, out.reference, out.token, ip, NOW);
    expect(view.state === "ok" && view.loan.canCancel).toBe(false);
    expect(await cancelTracked(t.db, out.reference, out.token, { ip }, NOW)).toBe("not_allowed");
    const [row] = await t.db.select().from(cases).where(eq(cases.id, out.caseId));
    expect(row!.status).toBe("on_loan");
  });
});

describe("the tracking-link email", () => {
  it("is bilingual, carries the link and the reference, and nothing the person wrote", () => {
    const link = "https://trytpc.example/th/borrow/track/link?ref=BR-2026-0007&t=abc";
    const mail = borrowingTrackingLink({ reference: "BR-2026-0007", link });
    expect(mail.subject).toContain("BR-2026-0007");
    expect(mail.text.indexOf("ลิงก์ส่วนตัว")).toBeLessThan(mail.text.indexOf("Your private link"));
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain("BR-2026-0007");
      expect(body).toContain("t=abc");
    }
    expect(mail.html).toContain('lang="th"');
    expect(mail.html).toContain('lang="en"');
  });

  it("escapes a link before putting it in HTML", () => {
    const mail = borrowingTrackingLink({ reference: "BR-2026-0007", link: 'https://x.test/?a=1&b="2"<script>' });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&amp;b=&quot;2&quot;&lt;script&gt;");
  });
});
