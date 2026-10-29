/**
 * Emails for the complaints service. Same conventions as lib/email/templates.ts:
 * Thai first and English second in one message, plain sentences, the reference
 * on its own line. They never carry what the person wrote, the category of a
 * restricted complaint, or any personal detail: a mailbox may be shared, and
 * the subject of a complaint can be sensitive. They point the person to their
 * private tracking link, which is the only way in.
 */

import { REOPEN_WINDOW_DAYS } from "@/lib/complaints/constants";
import type { RedirectTarget } from "@/lib/complaints/redirect";
import type { FacultyBody, FacultyOffice } from "@/lib/content/faculties";
import { UI } from "@/lib/i18n/strings";
import type { RenderedEmail } from "./templates";

interface Section {
  lang: "th" | "en";
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
  const p = (t: string) => `<p style="margin:0 0 16px">${esc(t)}</p>`;
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

function render(subject: string, th: Section, en: Section): RenderedEmail {
  const text = `${sectionText(th)}\n\n---\n\n${sectionText(en)}\n`;
  const html = [
    `<!doctype html>`,
    `<html lang="th">`,
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>`,
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

const SERVICE = UI.serviceName;

export interface ComplaintEmailParams {
  reference: string;
}

/** Staff have acknowledged the complaint. */
export function complaintAcknowledged({ reference }: ComplaintEmailParams): RenderedEmail {
  return render(
    `เจ้าหน้าที่รับเรื่องร้องเรียนของคุณแล้ว ${reference} / We have acknowledged your complaint ${reference}`,
    {
      lang: "th",
      heading: "เจ้าหน้าที่รับเรื่องร้องเรียนของคุณแล้ว",
      paragraphs: [
        `เจ้าหน้าที่ของ${SERVICE.th}ได้รับเรื่องร้องเรียนของคุณและกำลังดูแลอยู่`,
        "ดูความคืบหน้าและวันที่เราตั้งเป้าแจ้งผลได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง",
      ],
      reference: { label: "เลขอ้างอิงของคุณ", value: reference },
      after: ["ใครมีลิงก์ส่วนตัวก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น"],
    },
    {
      lang: "en",
      heading: "We have acknowledged your complaint",
      paragraphs: [
        `Staff at ${SERVICE.en} have received your complaint and are looking after it.`,
        "You can see how it is going, and the date we aim to give you an answer, from the private link you were given when you sent it.",
      ],
      reference: { label: "Your reference", value: reference },
      after: ["Anyone with the private link can see this complaint, so do not share it."],
    },
  );
}

/** The complaint has been resolved; the person is asked to look and to say how it went. */
export function complaintResolved({ reference }: ComplaintEmailParams): RenderedEmail {
  return render(
    `เรื่องร้องเรียนของคุณมีผลแล้ว ${reference} / There is an outcome to your complaint ${reference}`,
    {
      lang: "th",
      heading: "เรื่องร้องเรียนของคุณมีผลแล้ว",
      paragraphs: [
        "เปิดลิงก์ส่วนตัวของคุณเพื่ออ่านผลที่เจ้าหน้าที่แจ้ง และบอกเราว่าพอใจกับการดำเนินการหรือไม่",
        `หากคุณคิดว่าเรื่องยังไม่จบ คุณขอเปิดเรื่องอีกครั้งได้ภายใน ${REOPEN_WINDOW_DAYS} วัน จากหน้าเดียวกัน`,
      ],
      reference: { label: "เลขอ้างอิงของคุณ", value: reference },
      after: ["ใครมีลิงก์ส่วนตัวก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น"],
    },
    {
      lang: "en",
      heading: "There is an outcome to your complaint",
      paragraphs: [
        "Open your private link to read the outcome staff have written, and tell us how we did.",
        `If you think it is not finished, you can ask us to reopen it within ${REOPEN_WINDOW_DAYS} days, from the same page.`,
      ],
      reference: { label: "Your reference", value: reference },
      after: ["Anyone with the private link can see this complaint, so do not share it."],
    },
  );
}

export interface RedirectedEmailParams extends ComplaintEmailParams {
  target: RedirectTarget;
}

const instagramOf = (body: FacultyBody): string[] => body.contacts.filter((c) => c.channel === "instagram").map((c) => `@${c.value}`);

/** The office details an editor has filled in, one line each. Empty when none are. */
function officeLines(office: FacultyOffice, lang: "th" | "en"): string[] {
  const label = lang === "th" ? { where: "ที่ตั้ง", phone: "โทรศัพท์", email: "อีเมล", web: "เว็บไซต์" } : { where: "Where", phone: "Phone", email: "Email", web: "Website" };
  return [
    office.location?.[lang] ? `${label.where}: ${office.location[lang]}` : "",
    office.phone ? `${label.phone}: ${office.phone}` : "",
    office.email ? `${label.email}: ${office.email}` : "",
    office.website ? `${label.web}: ${office.website}` : "",
    office.note?.[lang] ?? "",
  ].filter(Boolean);
}

/** Who to contact instead, as plain paragraphs in one language. */
function redirectParagraphs({ level, faculty, bodies }: RedirectTarget, lang: "th" | "en"): string[] {
  const th = lang === "th";
  const out: string[] = [];
  if (level === "course") {
    out.push(th ? "เรื่องนี้เป็นเรื่องของรายวิชา ผู้สอนเป็นผู้ตัดสินขั้นสุดท้าย กรุณาเสนอเรื่องกับผู้สอนก่อน" : "This is a matter for your course. The lecturer has the final say, so please raise it with them first.");
    out.push(th ? "หากไม่สามารถเสนอเรื่องกับผู้สอนได้ ให้ติดต่อสำนักงานคณะ" : "If you cannot raise it with the lecturer, contact your faculty office.");
  } else {
    out.push(
      th
        ? "เรื่องนี้เป็นเรื่องของคณะ จึงอยู่นอกขอบเขตที่องค์การนักศึกษาและสภานักศึกษาดำเนินการได้ กรุณาติดต่อหน่วยงานต่อไปนี้"
        : "This is a matter for your faculty, which is outside what the Student Union and Student Council can act on. Please contact the people below.",
    );
    for (const body of bodies) {
      const handles = instagramOf(body);
      const programme = body.programme?.[lang];
      out.push([body.name[lang] || body.name[th ? "en" : "th"], programme ? (th ? `(หลักสูตร: ${programme})` : `(programme: ${programme})`) : "", handles.length ? `Instagram: ${handles.join(", ")}` : ""].filter(Boolean).join(" "));
    }
  }
  if (faculty) {
    const lines = officeLines(faculty.office, lang);
    out.push(`${th ? "สำนักงานคณะ" : "Faculty office"}: ${faculty.name[lang] || faculty.name[th ? "en" : "th"]}`);
    if (lines.length > 0) out.push(...lines);
    else out.push(th ? "เรายังไม่มีข้อมูลติดต่อสำนักงานนี้ ลองสอบถามที่คณะหรือค้นหาในเว็บไซต์ของคณะ" : "We do not have this office's contact details yet. Ask at the faculty, or look on its website.");
  } else {
    out.push(th ? "สอบถามรายละเอียดได้ที่คณะของคุณ" : "Please ask at your faculty for the details.");
  }
  return out;
}

/** The complaint is outside the union's remit and has been closed as redirected; says who to contact instead. */
export function complaintRedirected({ reference, target }: RedirectedEmailParams): RenderedEmail {
  return render(
    `เรื่องร้องเรียนของคุณอยู่นอกขอบเขตของเรา ${reference} / Your complaint is outside our remit ${reference}`,
    {
      lang: "th",
      heading: "เรื่องของคุณต้องติดต่อหน่วยงานอื่น",
      paragraphs: [`เจ้าหน้าที่ของ${SERVICE.th}อ่านเรื่องร้องเรียนของคุณแล้ว พบว่าเป็นเรื่องที่อยู่นอกขอบเขตของเรา จึงปิดเรื่องนี้`, ...redirectParagraphs(target, "th")],
      reference: { label: "เลขอ้างอิงของคุณ", value: reference },
      after: ["ดูข้อมูลนี้อีกครั้งได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง ใครมีลิงก์ก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น"],
    },
    {
      lang: "en",
      heading: "Your issue needs someone else",
      paragraphs: [`Staff at ${SERVICE.en} have read your complaint and found it is outside our remit, so we have closed it.`, ...redirectParagraphs(target, "en")],
      reference: { label: "Your reference", value: reference },
      after: ["You can see this again from the private link you were given when you sent it. Anyone with the link can see this complaint, so do not share it."],
    },
  );
}

export interface EscalationEmailParams {
  /** References only. The email never says what a complaint is about. */
  items: Array<{ reference: string; reason: "acknowledge" | "resolve" }>;
  /** Where staff open the queue. */
  inboxUrl: string;
}

/** To a lead: complaints that have missed a target. Staff-facing, so it also names the target. */
export function complaintsEscalated({ items, inboxUrl }: EscalationEmailParams): RenderedEmail {
  const th = items.map((i) => `${i.reference}: ${i.reason === "acknowledge" ? "เกินเวลาที่ตั้งไว้ในการรับเรื่อง" : "เกินเวลาที่ตั้งไว้ในการแก้ไข"}`);
  const en = items.map((i) => `${i.reference}: ${i.reason === "acknowledge" ? "not acknowledged in time" : "not resolved in time"}`);
  const subject = `มีเรื่องร้องเรียนเกินกำหนด ${items.length} เรื่อง / ${items.length} complaint${items.length === 1 ? "" : "s"} past target`;
  const section = (lang: "th" | "en", heading: string, intro: string, lines: string[], link: string) => ({
    text: [heading, "", intro, "", ...lines.map((l) => `- ${l}`), "", link, inboxUrl].join("\n"),
    html: `<div lang="${lang}"><h2 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h2><p style="margin:0 0 16px">${esc(intro)}</p><ul style="margin:0 0 16px;padding-left:24px">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p style="margin:0 0 24px"><a href="${esc(inboxUrl)}" style="color:#1d70b8">${esc(link)}</a></p></div>`,
  });
  const a = section("th", "มีเรื่องร้องเรียนเกินกำหนด", "เรื่องต่อไปนี้ยังไม่ได้รับเรื่องหรือยังไม่ได้แก้ไขภายในเวลาที่ตั้งไว้ เปิดคิวเรื่องเพื่อดู", th, "เปิดคิวเรื่อง");
  const b = section("en", "Complaints past their target", "These complaints have not been acknowledged or resolved within their target. Open the queue to see them.", en, "Open the queue");
  return {
    subject,
    text: `${a.text}\n\n---\n\n${b.text}\n`,
    html: `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;padding:24px 16px;background:#ffffff;color:#0b0c0c;font-family:Helvetica,Arial,'Noto Sans Thai',sans-serif;font-size:19px;line-height:1.5"><div style="max-width:600px;margin:0 auto">${a.html}<hr style="border:0;border-top:1px solid #b1b4b6;margin:32px 0">${b.html}</div></body></html>`,
  };
}
