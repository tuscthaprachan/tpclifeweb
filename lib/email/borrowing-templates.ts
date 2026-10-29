/**
 * Emails for the equipment borrowing service. Same conventions as
 * lib/email/templates.ts: Thai first and English second in one message, plain
 * sentences, the reference on its own line. This one carries the private
 * tracking link and the reference only: never the items, the event or any
 * personal detail, because a mailbox may be shared.
 */

import { UI } from "@/lib/i18n/strings";
import type { RenderedEmail } from "./templates";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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
    heading: "ลิงก์ส่วนตัวสำหรับติดตามคำขอยืมอุปกรณ์ของคุณ",
    lines: [`เลขอ้างอิงของคุณคือ ${reference}`, "ใช้ลิงก์ด้านล่างเพื่อดูสถานะ ยกเลิกคำขอก่อนรับอุปกรณ์ หรือดูวันเวลานัดรับ ใครมีลิงก์นี้ก็ดูคำขอนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น"],
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
  const p = (t: string) => `<p style="margin:0 0 16px">${esc(t)}</p>`;
  const section = (s: Section) =>
    `<div lang="${s.lang}"><h2 style="font-size:20px;margin:0 0 16px">${esc(s.heading)}</h2>${s.lines.map(p).join("")}<p style="margin:0 0 4px">${esc(s.linkLabel)}</p><p style="margin:0 0 24px"><a href="${esc(link)}" style="color:#1d70b8;word-break:break-all">${esc(link)}</a></p>${s.after.map(p).join("")}</div>`;
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;padding:24px 16px;background:#ffffff;color:#0b0c0c;font-family:Helvetica,Arial,'Noto Sans Thai',sans-serif;font-size:19px;line-height:1.5"><div style="max-width:600px;margin:0 auto">${section(th)}<hr style="border:0;border-top:1px solid #b1b4b6;margin:32px 0">${section(en)}</div></body></html>`;
  return { subject, text, html };
}
