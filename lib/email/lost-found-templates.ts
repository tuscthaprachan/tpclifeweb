/**
 * Emails to a person who reported something lost, sent from the staff
 * console when their report moves on. Same conventions as lib/email/templates.ts:
 * Thai first and English second in one message, plain sentences, the one thing
 * the reader needs on its own line. They carry the reference and the desk,
 * never a description of the item or any personal detail, and they ask the
 * person to bring their student card or other photo ID when collecting.
 */

import { UI } from "@/lib/i18n/strings";
import type { LocaleString } from "@/lib/i18n/config";
import type { RenderedEmail } from "./templates";

const SERVICE: LocaleString = UI.serviceName;

interface Section {
  lang: "th" | "en";
  heading: string;
  paragraphs: string[];
  reference: { label: string; value: string };
  after: string[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sectionText(s: Section): string {
  return [s.heading, "", ...s.paragraphs.flatMap((p) => [p, ""]), s.reference.label, s.reference.value, "", ...s.after.flatMap((p) => [p, ""])].join("\n").trimEnd();
}

function sectionHtml(s: Section): string {
  const p = (t: string) => `<p style="margin:0 0 16px">${escapeHtml(t)}</p>`;
  return [
    `<div lang="${s.lang}">`,
    `<h2 style="font-size:20px;margin:0 0 16px">${escapeHtml(s.heading)}</h2>`,
    ...s.paragraphs.map(p),
    `<p style="margin:0 0 4px">${escapeHtml(s.reference.label)}</p>`,
    `<p style="margin:0 0 24px"><strong style="font-size:28px;letter-spacing:2px;font-family:monospace">${escapeHtml(s.reference.value)}</strong></p>`,
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

export interface LostReportEmailParams {
  /** The lost report's reference, for example LF-2026-0007. */
  reference: string;
  /** The desk that holds the item, if known. */
  desk?: LocaleString | null;
}

const deskTh = (desk?: LocaleString | null) => (desk ? `ที่เคาน์เตอร์${desk.th}` : "ที่เคาน์เตอร์ของ อมธ. หรือสภาฯ");
const deskEn = (desk?: LocaleString | null) => (desk ? `at the ${desk.en} desk` : "at the TUSU or TUSC desk");

/** The reporter has a possible match. */
export function lostReportPossibleMatch({ reference, desk }: LostReportEmailParams): RenderedEmail {
  return render(
    `เราอาจพบของที่คุณแจ้งหาย ${reference} / We may have found what you lost ${reference}`,
    {
      lang: "th",
      heading: "เราอาจพบของที่คุณแจ้งหาย",
      paragraphs: [
        `เจ้าหน้าที่พบของที่อาจตรงกับเรื่องที่คุณแจ้งไว้กับ${SERVICE.th} ยังไม่แน่ใจว่าเป็นของคุณ เราจะตรวจสอบกับคุณก่อนส่งคืน`,
        `โปรดติดต่อเจ้าหน้าที่ ${deskTh(desk)} และแจ้งเลขอ้างอิงด้านล่าง`,
      ],
      reference: { label: "เลขอ้างอิงของคุณ", value: reference },
      after: ["อย่าส่งต่ออีเมลนี้ให้ผู้อื่น และเราจะไม่ขอรหัสผ่านหรือเลขบัตรทางอีเมล"],
    },
    {
      lang: "en",
      heading: "We may have found what you lost",
      paragraphs: [
        `Staff have found something that may match your report on ${SERVICE.en}. We are not sure it is yours yet, so we will check with you before we hand it over.`,
        `Please contact staff ${deskEn(desk)} and give them the reference below.`,
      ],
      reference: { label: "Your reference", value: reference },
      after: ["Do not forward this email. We will never ask for a password or an ID number by email."],
    },
  );
}

/** The match is confirmed and the item waits at the desk. */
export function lostReportReadyToCollect({ reference, desk }: LostReportEmailParams): RenderedEmail {
  return render(
    `พร้อมให้มารับของ ${reference} / Your item is ready to collect ${reference}`,
    {
      lang: "th",
      heading: "ของของคุณพร้อมให้มารับแล้ว",
      paragraphs: [
        `เราตรวจสอบแล้วและพร้อมคืนของให้คุณ มารับได้ ${deskTh(desk)} ในเวลาทำการ`,
        "โปรดนำบัตรนักศึกษาหรือบัตรประจำตัวที่มีรูปถ่ายมาด้วย เจ้าหน้าที่จะตรวจดูบัตรแต่ไม่จดเลขบัตร",
      ],
      reference: { label: "เลขอ้างอิงของคุณ", value: reference },
      after: ["หากมารับเองไม่ได้ โปรดติดต่อเจ้าหน้าที่ก่อน"],
    },
    {
      lang: "en",
      heading: "Your item is ready to collect",
      paragraphs: [
        `We have checked and we are ready to give it back. You can collect it ${deskEn(desk)} during opening hours.`,
        "Please bring your student card or another photo ID. Staff will look at it but will not write down the number.",
      ],
      reference: { label: "Your reference", value: reference },
      after: ["If you cannot come yourself, please contact staff first."],
    },
  );
}

/** The item has been handed back. */
export function lostReportReturned({ reference }: LostReportEmailParams): RenderedEmail {
  return render(
    `คืนของเรียบร้อยแล้ว ${reference} / Your item has been returned ${reference}`,
    {
      lang: "th",
      heading: "คืนของเรียบร้อยแล้ว",
      paragraphs: [`เจ้าหน้าที่บันทึกแล้วว่าคุณได้รับของคืน เรื่องที่คุณแจ้งกับ${SERVICE.th}จึงปิดลง ขอบคุณที่แจ้งให้เราทราบ`],
      reference: { label: "เลขอ้างอิงของคุณ", value: reference },
      after: ["หากคุณยังไม่ได้รับของ โปรดติดต่อเจ้าหน้าที่ทันที"],
    },
    {
      lang: "en",
      heading: "Your item has been returned",
      paragraphs: [`Staff have recorded that you got your item back, so your report on ${SERVICE.en} is now closed. Thank you for letting us know.`],
      reference: { label: "Your reference", value: reference },
      after: ["If you have not received it, please contact staff straight away."],
    },
  );
}
