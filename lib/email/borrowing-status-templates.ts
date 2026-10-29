/**
 * Emails for the equipment borrowing service: the decision, a reminder the
 * working day before a return, and one overdue notice. Same conventions as
 * lib/email/complaint-templates.ts: both languages in one message, plain
 * sentences, the reference on its own line. The borrower's language comes
 * first. They never carry the event, the group, the items or any personal
 * detail, because a mailbox may be shared; they point to the private link.
 */

import { DESK_CLOSES, DESK_OPENS } from "@/lib/borrowing/constants";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import type { RenderedEmail } from "./templates";

interface Section {
  lang: Locale;
  heading: string;
  paragraphs: string[];
  reference: { label: string; value: string };
  after: string[];
}

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function sectionText(s: Section): string {
  return [s.heading, "", ...s.paragraphs.flatMap((p) => [p, ""]), s.reference.label, s.reference.value, "", ...s.after.flatMap((p) => [p, ""])].join("\n").trimEnd();
}

function sectionHtml(s: Section): string {
  const p = (t: string) => `<p style="margin:0 0 16px;white-space:pre-line">${esc(t)}</p>`;
  return [
    `<div lang="${s.lang}">`,
    `<h2 style="font-size:20px;margin:0 0 16px">${esc(s.heading)}</h2>`,
    ...s.paragraphs.map(p),
    `<p style="margin:0 0 4px">${esc(s.reference.label)}</p>`,
    `<p style="margin:0 0 24px"><strong style="font-size:28px;letter-spacing:2px;font-family:monospace">${esc(s.reference.value)}</strong></p>`,
    ...s.after.map(p),
    `</div>`,
  ].join("\n");
}

/** Renders the two halves, the borrower's language first. */
function render(subject: { th: string; en: string }, th: Section, en: Section, first: Locale): RenderedEmail {
  const [one, two] = first === "en" ? [en, th] : [th, en];
  const title = first === "en" ? `${subject.en} / ${subject.th}` : `${subject.th} / ${subject.en}`;
  const text = `${sectionText(one)}\n\n---\n\n${sectionText(two)}\n`;
  const html = [
    `<!doctype html>`,
    `<html lang="${first}">`,
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title></head>`,
    `<body style="margin:0;padding:24px 16px;background:#ffffff;color:#0b0c0c;font-family:Helvetica,Arial,'Noto Sans Thai',sans-serif;font-size:19px;line-height:1.5">`,
    `<div style="max-width:600px;margin:0 auto">`,
    sectionHtml(one),
    `<hr style="border:0;border-top:1px solid #b1b4b6;margin:32px 0">`,
    sectionHtml(two),
    `</div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
  return { subject: title, text, html };
}

const SERVICE = UI.serviceName;
const REFERENCE = { th: "เลขอ้างอิงของคุณ", en: "Your reference" };
const PRIVATE_TH = "ใครมีลิงก์ส่วนตัวก็ดูคำขอนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น";
const PRIVATE_EN = "Anyone with the private link can see this request, so do not share it.";
const HOURS = `${DESK_OPENS} - ${DESK_CLOSES}`;

export interface LoanEmailParams {
  reference: string;
  /** The borrower's language: its half comes first. */
  locale?: Locale | null;
}

export interface LoanApprovedParams extends LoanEmailParams {
  collectAt: Date;
  returnDueAt: Date;
  /** Student or national ID cards to leave as a deposit. */
  cards: number;
}

/** The request was approved: when to collect, what to bring, when to return. */
export function loanApproved({ reference, locale, collectAt, returnDueAt, cards }: LoanApprovedParams): RenderedEmail {
  return render(
    { th: `อนุมัติคำขอยืมอุปกรณ์แล้ว ${reference}`, en: `Your equipment request is approved ${reference}` },
    {
      lang: "th",
      heading: "อนุมัติคำขอยืมอุปกรณ์ของคุณแล้ว",
      paragraphs: [
        `เจ้าหน้าที่ของ${SERVICE.th}อนุมัติคำขอของคุณแล้ว มารับอุปกรณ์ได้ในวันที่ ${formatDateTime(collectAt, "th")} และคืนภายในวันที่ ${formatDateTime(returnDueAt, "th")}`,
        cards > 0 ? `วันรับอุปกรณ์ ให้นำบัตรนักศึกษาหรือบัตรประจำตัวประชาชนตัวจริง ${cards} ใบ มาวางเป็นหลักประกัน และรับบัตรคืนเมื่อคืนอุปกรณ์ครบ` : "วันรับอุปกรณ์ ให้นำบัตรนักศึกษาหรือบัตรประจำตัวประชาชนตัวจริงมาแสดง",
        `เคาน์เตอร์เปิดวันจันทร์ถึงวันศุกร์ เวลา ${HOURS} น. ดูจำนวนและข้อความจากเจ้าหน้าที่ได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งคำขอ`,
      ],
      reference: { label: REFERENCE.th, value: reference },
      after: [PRIVATE_TH],
    },
    {
      lang: "en",
      heading: "Your equipment request is approved",
      paragraphs: [
        `Staff at ${SERVICE.en} have approved your request. Collect the equipment on ${formatDateTime(collectAt, "en")} and return it by ${formatDateTime(returnDueAt, "en")}.`,
        cards > 0
          ? `When you collect it, bring ${cards === 1 ? "your original student card or national ID card" : `${cards} original student cards or national ID cards`} to leave as a deposit. You get ${cards === 1 ? "it" : "them"} back when everything is returned.`
          : "When you collect it, bring your original student card or national ID card to show.",
        `The desk is open Monday to Friday, ${HOURS}. You can see the quantities approved, and any message from staff, on the private link you were given when you sent the request.`,
      ],
      reference: { label: REFERENCE.en, value: reference },
      after: [PRIVATE_EN],
    },
    locale ?? "th",
  );
}

export interface LoanDeclinedParams extends LoanEmailParams {
  /** Staff's reason, in the languages they wrote it in. Shown as written. */
  reason: { th?: string | null; en?: string | null };
}

/** The request was not approved, with the reason. */
export function loanDeclined({ reference, locale, reason }: LoanDeclinedParams): RenderedEmail {
  const th = reason.th?.trim() || reason.en?.trim() || "";
  const en = reason.en?.trim() || reason.th?.trim() || "";
  return render(
    { th: `ไม่อนุมัติคำขอยืมอุปกรณ์ ${reference}`, en: `Your equipment request was not approved ${reference}` },
    {
      lang: "th",
      heading: "ไม่อนุมัติคำขอยืมอุปกรณ์ของคุณ",
      paragraphs: [`เจ้าหน้าที่ของ${SERVICE.th}ไม่สามารถอนุมัติคำขอของคุณได้ ด้วยเหตุผลนี้`, th, "คุณส่งคำขอใหม่ได้ โดยเลือกวันหรือรายการอุปกรณ์ที่ว่างอยู่"],
      reference: { label: REFERENCE.th, value: reference },
      after: [PRIVATE_TH],
    },
    {
      lang: "en",
      heading: "Your equipment request was not approved",
      paragraphs: [`Staff at ${SERVICE.en} could not approve your request. This is the reason.`, en, "You can make a new request, choosing dates or items that are free."],
      reference: { label: REFERENCE.en, value: reference },
      after: [PRIVATE_EN],
    },
    locale ?? "th",
  );
}

export interface LoanDueParams extends LoanEmailParams {
  returnDueAt: Date;
}

/** The working day before the return is due. */
export function loanReminder({ reference, locale, returnDueAt }: LoanDueParams): RenderedEmail {
  return render(
    { th: `เตือนคืนอุปกรณ์ ${reference}`, en: `Reminder to return equipment ${reference}` },
    {
      lang: "th",
      heading: "ใกล้ถึงกำหนดคืนอุปกรณ์",
      paragraphs: [`อุปกรณ์ที่คุณยืมต้องคืนภายในวันที่ ${formatDateTime(returnDueAt, "th")}`, `คืนได้ที่เคาน์เตอร์ วันจันทร์ถึงวันศุกร์ เวลา ${HOURS} น. หากคืนไม่ทัน ให้ติดต่อเจ้าหน้าที่ล่วงหน้า`],
      reference: { label: REFERENCE.th, value: reference },
      after: [PRIVATE_TH],
    },
    {
      lang: "en",
      heading: "Your equipment is due back soon",
      paragraphs: [`The equipment you borrowed is due back by ${formatDateTime(returnDueAt, "en")}.`, `Return it to the desk, Monday to Friday, ${HOURS}. If you cannot return it in time, contact the desk before then.`],
      reference: { label: REFERENCE.en, value: reference },
      after: [PRIVATE_EN],
    },
    locale ?? "th",
  );
}

/** Once, when the return time has passed and the equipment is still out. */
export function loanOverdue({ reference, locale, returnDueAt }: LoanDueParams): RenderedEmail {
  return render(
    { th: `เลยกำหนดคืนอุปกรณ์ ${reference}`, en: `Your equipment is overdue ${reference}` },
    {
      lang: "th",
      heading: "เลยกำหนดคืนอุปกรณ์แล้ว",
      paragraphs: [
        `อุปกรณ์ที่คุณยืมต้องคืนภายในวันที่ ${formatDateTime(returnDueAt, "th")} แต่เรายังไม่ได้รับคืน`,
        `กรุณานำมาคืนที่เคาน์เตอร์โดยเร็ว วันจันทร์ถึงวันศุกร์ เวลา ${HOURS} น. หากมีปัญหา ให้ติดต่อเจ้าหน้าที่ เพื่อไม่ให้คนถัดไปที่จองไว้ได้รับผลกระทบ`,
      ],
      reference: { label: REFERENCE.th, value: reference },
      after: [PRIVATE_TH],
    },
    {
      lang: "en",
      heading: "Your equipment is overdue",
      paragraphs: [
        `The equipment you borrowed was due back by ${formatDateTime(returnDueAt, "en")} and we have not had it back yet.`,
        `Please bring it to the desk as soon as you can, Monday to Friday, ${HOURS}. If something is wrong, contact the desk, so the next person who booked it is not let down.`,
      ],
      reference: { label: REFERENCE.en, value: reference },
      after: [PRIVATE_EN],
    },
    locale ?? "th",
  );
}
