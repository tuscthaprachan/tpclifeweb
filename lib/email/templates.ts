/**
 * Email templates, in code.
 *
 * Every email carries Thai first and English second in the same message,
 * because the recipient may read either and we cannot know which. Style
 * follows GOV.UK Notify: plain, no images, a clear subject, the one thing the
 * reader needs (link, reference) set out on its own line, and short
 * sentences. Thai is written as Thai, not translated from the English.
 *
 * HTML is minimal on purpose: headings, paragraphs, one link, inline styles
 * only, system fonts, `lang` on each half so screen readers switch voice.
 */

import { UI } from "@/lib/i18n/strings";
import type { LocaleString } from "@/lib/i18n/config";

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/** One language's worth of an email. `highlight` is the link or reference to set apart. */
interface Section {
  lang: "th" | "en";
  heading: string;
  paragraphs: string[];
  highlight?: { label: string; value: string; isLink?: boolean };
  after: string[];
}

const SERVICE: LocaleString = UI.serviceName;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assertHttpUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Email link must be an absolute URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Email link must be http or https.");
  }
}

function sectionText(s: Section): string {
  const lines = [s.heading, "", ...s.paragraphs.flatMap((p) => [p, ""])];
  if (s.highlight) lines.push(s.highlight.label, s.highlight.value, "");
  lines.push(...s.after.flatMap((p) => [p, ""]));
  return lines.join("\n").trimEnd();
}

function sectionHtml(s: Section): string {
  const p = (t: string) => `<p style="margin:0 0 16px">${escapeHtml(t)}</p>`;
  const value = s.highlight
    ? s.highlight.isLink
      ? `<a href="${escapeHtml(s.highlight.value)}" style="color:#1d70b8;word-break:break-all">${escapeHtml(s.highlight.value)}</a>`
      : `<strong style="font-size:32px;letter-spacing:4px;font-family:monospace">${escapeHtml(s.highlight.value)}</strong>`
    : "";
  const highlight = s.highlight
    ? `<p style="margin:0 0 4px">${escapeHtml(s.highlight.label)}</p><p style="margin:0 0 24px">${value}</p>`
    : "";
  return [
    `<div lang="${s.lang}">`,
    `<h2 style="font-size:20px;margin:0 0 16px">${escapeHtml(s.heading)}</h2>`,
    ...s.paragraphs.map(p),
    highlight,
    ...s.after.map(p),
    `</div>`,
  ].join("\n");
}

function render(subject: string, th: Section, en: Section): RenderedEmail {
  const text = `${sectionText(th)}\n\n---\n\n${sectionText(en)}\n`;
  const html = [
    `<!doctype html>`,
    `<html lang="th">`,
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>`,
    `<body style="margin:0;padding:24px 16px;background:#ffffff;color:#0b0c0c;font-family:Helvetica,Arial,'Noto Sans Thai',sans-serif;font-size:19px;line-height:1.5">`,
    `<div style="max-width:600px;margin:0 auto">`,
    sectionHtml(th),
    `<hr style="border:0;border-top:1px solid #b1b4b6;margin:32px 0">`,
    sectionHtml(en),
    `</div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
  return { subject, text, html };
}

export interface StaffInviteParams {
  inviterName: string;
  organisation: LocaleString;
  acceptUrl: string;
  expiresInDays: number;
}

export function staffInvite({ inviterName, organisation, acceptUrl, expiresInDays }: StaffInviteParams): RenderedEmail {
  assertHttpUrl(acceptUrl);
  const n = Math.max(1, Math.round(expiresInDays));
  const subject = `คำเชิญเข้าร่วมทีมเจ้าหน้าที่ ${organisation.th} / You have been invited to join ${organisation.en} staff`;
  return render(
    subject,
    {
      lang: "th",
      heading: "คำเชิญเข้าร่วมทีมเจ้าหน้าที่",
      paragraphs: [
        `${inviterName} เชิญคุณเข้าร่วมเป็นเจ้าหน้าที่ของ${organisation.th} บน${SERVICE.th}`,
        "เปิดลิงก์ด้านล่าง กรอกชื่อของคุณ และสร้างบัญชีด้วยพาสคีย์ (ลายนิ้วมือ ใบหน้า หรือการล็อกหน้าจอ) ไม่ต้องใช้รหัสผ่าน",
      ],
      highlight: { label: "ลิงก์รับคำเชิญ", value: acceptUrl, isLink: true },
      after: [
        `ลิงก์นี้ใช้ได้ ${n} วัน`,
        "ห้ามส่งต่อลิงก์นี้ให้ผู้อื่น",
        "หากคุณไม่รู้จักผู้เชิญ หรือไม่ได้คาดว่าจะได้รับคำเชิญนี้ ไม่ต้องทำอะไร ข้ามอีเมลฉบับนี้ไปได้เลย",
      ],
    },
    {
      lang: "en",
      heading: "You have been invited to join the staff team",
      paragraphs: [
        `${inviterName} has invited you to join ${organisation.en} staff on ${SERVICE.en}.`,
        "Open the link below, enter your name and create your account with a passkey (your fingerprint, face or screen lock). You do not need a password.",
      ],
      highlight: { label: "Link to accept the invitation", value: acceptUrl, isLink: true },
      after: [
        `This link expires in ${n} ${n === 1 ? "day" : "days"}.`,
        "Do not forward this link. Anyone who opens it can create the account.",
        "If you do not know who invited you, or were not expecting this, ignore this email. You do not need to do anything.",
      ],
    },
  );
}

export interface StaffRecoveryParams {
  organisation: LocaleString;
  recoverUrl: string;
  expiresInHours: number;
}

export function staffRecovery({ organisation, recoverUrl, expiresInHours }: StaffRecoveryParams): RenderedEmail {
  assertHttpUrl(recoverUrl);
  const n = Math.max(1, Math.round(expiresInHours));
  const subject = `ลิงก์กู้คืนบัญชี ${SERVICE.th} / Your ${SERVICE.en} account recovery link`;
  return render(
    subject,
    {
      lang: "th",
      heading: "ลิงก์กู้คืนบัญชีเจ้าหน้าที่",
      paragraphs: [
        `ผู้ดูแลระบบของ${organisation.th}สร้างลิงก์นี้ให้คุณ เพื่อให้คุณเข้าสู่ระบบ${SERVICE.th}ได้อีกครั้งหลังพาสคีย์เดิมหายหรือใช้ไม่ได้`,
        "เปิดลิงก์ด้านล่างเพื่อสร้างพาสคีย์ใหม่ เมื่อใช้ลิงก์แล้ว เราจะออกจากระบบทุกอุปกรณ์ของคุณ",
      ],
      highlight: { label: "ลิงก์กู้คืนบัญชี", value: recoverUrl, isLink: true },
      after: [
        `ลิงก์นี้ใช้ได้ ${n} ชั่วโมง และใช้ได้เพียงครั้งเดียว`,
        "ห้ามส่งต่อลิงก์นี้ให้ผู้อื่น",
        "หากคุณไม่ได้ขอการกู้คืนบัญชี ไม่ต้องเปิดลิงก์ และแจ้งผู้ดูแลระบบ",
      ],
    },
    {
      lang: "en",
      heading: "Your staff account recovery link",
      paragraphs: [
        `An administrator at ${organisation.en} made this link for you, so you can sign in to ${SERVICE.en} again after losing your passkey.`,
        "Open the link below to create a new passkey. Once you use it, we sign you out everywhere else.",
      ],
      highlight: { label: "Account recovery link", value: recoverUrl, isLink: true },
      after: [
        `This link expires in ${n} ${n === 1 ? "hour" : "hours"} and works once.`,
        "Do not forward this link. Anyone who opens it can take over the account.",
        "If you did not ask for your account to be recovered, do not open the link, and tell an administrator.",
      ],
    },
  );
}
