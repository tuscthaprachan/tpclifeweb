/**
 * Emails for the equipment borrowing service. Same conventions as
 * lib/email/templates.ts: Thai first and English second in one message, plain
 * sentences, the reference on its own line. This one carries the private
 * tracking link and the reference only: never the items, the event or any
 * personal detail, because a mailbox may be shared.
 */

import { UI } from "@/lib/i18n/strings";
import { button, emailDocument, heading, paragraph, section } from "./layout";
import type { RenderedEmail } from "./templates";

interface Section {
  lang: "th" | "en";
  heading: string;
  lines: string[];
  linkLabel: string;
  after: string[];
}

export interface BorrowingTrackingLinkParams {
  reference: string;
  link: string;
}

/** The private link to track a loan request, sent when the borrower asks for it on the confirmation page. */
export function borrowingTrackingLink({ reference, link }: BorrowingTrackingLinkParams): RenderedEmail {
  const th: Section = {
    lang: "th",
    heading: "ลิงก์ส่วนตัวสำหรับติดตามคำขอยืมอุปกรณ์",
    lines: [`เลขอ้างอิงคือ ${reference}`, "ใช้ลิงก์ด้านล่างเพื่อดูสถานะ ยกเลิกคำขอก่อนรับอุปกรณ์ หรือดูวันเวลานัดรับ ใครมีลิงก์นี้ก็ดูคำขอนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น"],
    linkLabel: "ลิงก์ส่วนตัวของคุณ",
    after: ["หากคุณไม่ได้ส่งคำขอนี้ ข้ามอีเมลฉบับนี้ไปได้เลย"],
  };
  const en: Section = {
    lang: "en",
    heading: "Your private link to track your equipment request",
    lines: [`Your reference number is ${reference}.`, "Use the link below to see the status, cancel the request before you collect, or check your collection time. Anyone with the link can see this request, so do not share it."],
    linkLabel: "Your private link",
    after: ["If you did not send this request, ignore this email."],
  };
  const subject = `${UI.brServiceName.th}: ${reference} / ${UI.brServiceName.en}: ${reference}`;
  const text = [th, en].map((s) => [s.heading, "", ...s.lines.flatMap((l) => [l, ""]), s.linkLabel, link, "", ...s.after].join("\n")).join("\n\n---\n\n");
  const render = (s: Section) =>
    section(s.lang, [heading(s.lang, s.heading), ...s.lines.map((t) => paragraph(s.lang, t)), button(s.lang, s.linkLabel, link), ...s.after.map((t) => paragraph(s.lang, t))]);
  const html = emailDocument({ title: subject, lang: "th", sections: [render(th), render(en)], preheader: th.lines[0] });
  return { subject, text, html };
}
