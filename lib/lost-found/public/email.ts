/**
 * The optional "email me my private link" message. Email is never required:
 * the link is shown on the confirmation page either way, and a failure to send
 * is reported, never fatal. Thai first and English second in one message, in
 * the plain style of the other service emails (lib/email/templates.ts).
 */

import { getEmailSender, isEmailConfigured, type EmailMessage } from "@/lib/email";
import { button, emailDocument, heading, paragraph, reference as referenceBlock, section } from "@/lib/email/layout";
import type { JourneyKind } from "./steps";

export { isEmailConfigured };

export function trackingLinkEmail(kind: JourneyKind, reference: string, link: string): Omit<EmailMessage, "to"> {
  const claim = kind === "claim";
  const th = {
    heading: claim ? "ลิงก์ส่วนตัวสำหรับติดตามคำขอรับของ" : "ลิงก์ส่วนตัวสำหรับติดตามเรื่องที่คุณแจ้ง",
    line: "ใช้ลิงก์ด้านล่างเพื่อดูความคืบหน้า ใครมีลิงก์นี้ก็ดูความคืบหน้าได้ จึงไม่ควรส่งต่อให้ผู้อื่น",
    referenceLabel: "เลขอ้างอิงของคุณ",
    linkLabel: "เปิดหน้าติดตามเรื่อง",
    after: "หากไม่ได้ส่งเรื่องนี้ ข้ามอีเมลฉบับนี้ไปได้เลย",
  };
  const en = {
    heading: claim ? "Your private link to track your claim" : "Your private link to track your report",
    line: "Use the link below to see progress. Anyone with the link can see how this case is going, so do not share it.",
    referenceLabel: "Your reference number",
    linkLabel: "Open your tracking page",
    after: "If you did not send this, ignore this email.",
  };
  const subject = `${claim ? "ติดตามคำขอรับของ" : "ติดตามเรื่องที่คุณแจ้ง"} ${reference} / ${claim ? "Track your claim" : "Track your report"} ${reference}`;
  const text = [th, en].map((s) => [s.heading, "", s.referenceLabel, reference, "", s.line, "", s.linkLabel, link, "", s.after].join("\n")).join("\n\n---\n\n");
  const html = emailDocument({
    title: subject,
    lang: "th",
    preheader: th.line,
    sections: [
      section("th", [heading("th", th.heading), referenceBlock("th", th.referenceLabel, reference), paragraph("th", th.line), button("th", th.linkLabel, link), paragraph("th", th.after)]),
      section("en", [heading("en", en.heading), referenceBlock("en", en.referenceLabel, reference), paragraph("en", en.line), button("en", en.linkLabel, link), paragraph("en", en.after)]),
    ],
  });
  return { subject, text, html };
}

/** Sends the link. Returns false (never throws) when email is off or the send fails. */
export async function sendTrackingLinkEmail(to: string, kind: JourneyKind, reference: string, link: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  try {
    await getEmailSender().send({ to, ...trackingLinkEmail(kind, reference, link) });
    return true;
  } catch (error) {
    console.error("[lost-found] tracking link email not sent", error instanceof Error ? error.message : error);
    return false;
  }
}
