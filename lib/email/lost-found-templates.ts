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
import { emailDocument, heading, paragraph, reference, section } from "./layout";
import type { RenderedEmail } from "./templates";

const SERVICE: LocaleString = UI.serviceName;

interface Section {
  lang: "th" | "en";
  heading: string;
  paragraphs: string[];
  reference: { label: string; value: string };
  after: string[];
}

function sectionText(s: Section): string {
  return [s.heading, "", ...s.paragraphs.flatMap((p) => [p, ""]), s.reference.label, s.reference.value, "", ...s.after.flatMap((p) => [p, ""])].join("\n").trimEnd();
}

function sectionHtml(s: Section): string {
  return section(s.lang, [
    heading(s.lang, s.heading),
    ...s.paragraphs.map((t) => paragraph(s.lang, t)),
    reference(s.lang, s.reference.label, s.reference.value),
    ...s.after.map((t) => paragraph(s.lang, t)),
  ]);
}

function render(subject: string, th: Section, en: Section): RenderedEmail {
  const text = `${sectionText(th)}\n\n---\n\n${sectionText(en)}\n`;
  const html = emailDocument({ title: subject, lang: "th", sections: [sectionHtml(th), sectionHtml(en)], preheader: th.paragraphs[0] });
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
      after: ["อย่าส่งต่ออีเมลนี้ให้ผู้อื่น ทั้งนี้ เราไม่เคยขอรหัสผ่านหรือเลขบัตรทางอีเมล"],
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
    `มารับของคืนได้แล้ว ${reference} / Your item is ready to collect ${reference}`,
    {
      lang: "th",
      heading: "มารับของคืนได้แล้ว",
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
      paragraphs: [`เจ้าหน้าที่บันทึกแล้วว่าคุณได้รับของคืน จึงขอปิดเรื่องที่คุณแจ้งไว้กับ${SERVICE.th} ขอบคุณที่แจ้งให้เราทราบ`],
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

/** The claim on the found item that matched the reporter's report was not accepted. */
export function lostReportClaimDeclined({ reference, desk }: LostReportEmailParams): RenderedEmail {
  return render(
    `ยังคืนของตามที่คุณแจ้งไม่ได้ ${reference} / Your claim was not accepted ${reference}`,
    {
      lang: "th",
      heading: "ยังคืนของตามที่คุณแจ้งไม่ได้",
      paragraphs: [
        `เจ้าหน้าที่ตรวจสอบคำขอรับของคืนตามเรื่องที่คุณแจ้งไว้กับ${SERVICE.th}แล้ว แต่ยังยืนยันไม่ได้ว่าเป็นของคุณ จึงยังคืนของให้ไม่ได้`,
        `เรื่องที่คุณแจ้งยังไม่ปิด หากพบของที่ตรงกัน เราจะแจ้งให้ทราบอีกครั้ง หากมีข้อมูลเพิ่มเติม โปรดติดต่อเจ้าหน้าที่ ${deskTh(desk)} และแจ้งเลขอ้างอิงด้านล่าง`,
      ],
      reference: { label: "เลขอ้างอิงของคุณ", value: reference },
      after: ["อย่าส่งต่ออีเมลนี้ให้ผู้อื่น ทั้งนี้ เราไม่เคยขอรหัสผ่านหรือเลขบัตรทางอีเมล"],
    },
    {
      lang: "en",
      heading: "Your claim was not accepted",
      paragraphs: [
        `Staff have checked a claim linked to your report on ${SERVICE.en}, but could not confirm the item is yours, so it has not been handed over.`,
        `Your report is still open and we will tell you if we find a match. If you have more to tell us, please contact staff ${deskEn(desk)} and give them the reference below.`,
      ],
      reference: { label: "Your reference", value: reference },
      after: ["Do not forward this email. We will never ask for a password or an ID number by email."],
    },
  );
}

export interface ClaimEmailParams {
  /** The found item's reference, which the claimant was given when they made the claim. */
  reference: string;
  desk?: LocaleString | null;
}

/** The claimant's claim was accepted and the item waits at the desk. */
export function claimAccepted({ reference, desk }: ClaimEmailParams): RenderedEmail {
  return render(
    `อนุมัติคำขอรับของคืนแล้ว ${reference} / Your claim was accepted ${reference}`,
    {
      lang: "th",
      heading: "อนุมัติคำขอรับของคืนแล้ว",
      paragraphs: [
        `เจ้าหน้าที่ของ${SERVICE.th}ตรวจสอบแล้วและพร้อมคืนของให้คุณ มารับได้ ${deskTh(desk)} ในเวลาทำการ`,
        "โปรดนำบัตรนักศึกษาหรือบัตรประจำตัวที่มีรูปถ่ายมาด้วย เจ้าหน้าที่จะตรวจดูบัตรแต่ไม่จดเลขบัตร",
      ],
      reference: { label: "เลขอ้างอิง", value: reference },
      after: ["หากมารับเองไม่ได้ โปรดติดต่อเจ้าหน้าที่ก่อน"],
    },
    {
      lang: "en",
      heading: "Your claim was accepted",
      paragraphs: [
        `Staff at ${SERVICE.en} have checked and we are ready to give the item back. You can collect it ${deskEn(desk)} during opening hours.`,
        "Please bring your student card or another photo ID. Staff will look at it but will not write down the number.",
      ],
      reference: { label: "Reference", value: reference },
      after: ["If you cannot come yourself, please contact staff first."],
    },
  );
}

/** The claimant's claim was not accepted. */
export function claimDeclined({ reference, desk }: ClaimEmailParams): RenderedEmail {
  return render(
    `ยังไม่อนุมัติคำขอรับของคืน ${reference} / Your claim was not accepted ${reference}`,
    {
      lang: "th",
      heading: "ยังไม่อนุมัติคำขอรับของคืน",
      paragraphs: [
        `เจ้าหน้าที่ของ${SERVICE.th}ตรวจสอบคำขอรับของคืนแล้ว แต่ยังยืนยันไม่ได้ว่าเป็นของคุณ จึงยังคืนของให้ไม่ได้`,
        `หากมีข้อมูลเพิ่มเติม โปรดติดต่อเจ้าหน้าที่ ${deskTh(desk)} และแจ้งเลขอ้างอิงด้านล่าง`,
      ],
      reference: { label: "เลขอ้างอิง", value: reference },
      after: ["อย่าส่งต่ออีเมลนี้ให้ผู้อื่น ทั้งนี้ เราไม่เคยขอรหัสผ่านหรือเลขบัตรทางอีเมล"],
    },
    {
      lang: "en",
      heading: "Your claim was not accepted",
      paragraphs: [
        `Staff at ${SERVICE.en} have checked your claim but could not confirm the item is yours, so it has not been handed over.`,
        `If you have more to tell us, please contact staff ${deskEn(desk)} and give them the reference below.`,
      ],
      reference: { label: "Reference", value: reference },
      after: ["Do not forward this email. We will never ask for a password or an ID number by email."],
    },
  );
}
