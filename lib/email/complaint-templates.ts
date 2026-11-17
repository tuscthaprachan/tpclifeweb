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
import { button, emailDocument, heading, list, paragraph, reference, section } from "./layout";
import type { RenderedEmail } from "./templates";

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
        `เจ้าหน้าที่ของ${SERVICE.th}ได้รับเรื่องร้องเรียนแล้วและกำลังดำเนินการ`,
        "ดูความคืบหน้าและวันที่คาดว่าจะแจ้งผลได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง",
      ],
      reference: { label: "เลขอ้างอิง", value: reference },
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
    `เจ้าหน้าที่แจ้งผลเรื่องร้องเรียนของคุณแล้ว ${reference} / There is an outcome to your complaint ${reference}`,
    {
      lang: "th",
      heading: "เจ้าหน้าที่แจ้งผลเรื่องร้องเรียนของคุณแล้ว",
      paragraphs: [
        "เปิดลิงก์ส่วนตัวเพื่ออ่านผลที่เจ้าหน้าที่แจ้ง และบอกเราว่าพอใจกับการดำเนินการหรือไม่",
        `หากเห็นว่าเรื่องยังไม่จบ ขอเปิดเรื่องอีกครั้งได้ภายใน ${REOPEN_WINDOW_DAYS} วัน จากหน้าเดียวกัน`,
      ],
      reference: { label: "เลขอ้างอิง", value: reference },
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
    out.push(th ? "เรื่องนี้เกี่ยวกับรายวิชา ซึ่งผู้สอนมีอำนาจตัดสิน กรุณาปรึกษาผู้สอนก่อน" : "This is a matter for your course. The lecturer has the final say, so please raise it with them first.");
    out.push(th ? "หากปรึกษาผู้สอนไม่ได้ ให้ติดต่อสำนักงานคณะ" : "If you cannot raise it with the lecturer, contact your faculty office.");
  } else {
    out.push(
      th
        ? "เรื่องนี้เป็นเรื่องภายในคณะ ซึ่งไม่อยู่ในอำนาจหน้าที่ขององค์การนักศึกษาและสภานักศึกษา กรุณาติดต่อหน่วยงานต่อไปนี้"
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
    out.push(th ? "สอบถามรายละเอียดได้ที่คณะ" : "Please ask at your faculty for the details.");
  }
  return out;
}

/** The complaint is outside the union's remit and has been closed as redirected; says who to contact instead. */
export function complaintRedirected({ reference, target }: RedirectedEmailParams): RenderedEmail {
  return render(
    `เรื่องร้องเรียนของคุณไม่อยู่ในความรับผิดชอบของเรา ${reference} / Your complaint is outside our remit ${reference}`,
    {
      lang: "th",
      heading: "เรื่องนี้ต้องติดต่อหน่วยงานอื่น",
      paragraphs: [`เจ้าหน้าที่ของ${SERVICE.th}อ่านเรื่องร้องเรียนของคุณแล้ว พบว่าไม่อยู่ในความรับผิดชอบของเรา จึงขอปิดเรื่อง`, ...redirectParagraphs(target, "th")],
      reference: { label: "เลขอ้างอิง", value: reference },
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

/** To an officer: complaints that have missed a target. Staff-facing, so it also names the target. */
export function complaintsEscalated({ items, inboxUrl }: EscalationEmailParams): RenderedEmail {
  const th = items.map((i) => `${i.reference}: ${i.reason === "acknowledge" ? "รับเรื่องไม่ทันกำหนด" : "แก้ไขไม่ทันกำหนด"}`);
  const en = items.map((i) => `${i.reference}: ${i.reason === "acknowledge" ? "not acknowledged in time" : "not resolved in time"}`);
  const subject = `มีเรื่องร้องเรียนเกินกำหนด ${items.length} เรื่อง / ${items.length} complaint${items.length === 1 ? "" : "s"} past target`;
  const part = (lang: "th" | "en", title: string, intro: string, lines: string[], link: string) => ({
    text: [title, "", intro, "", ...lines.map((l) => `- ${l}`), "", link, inboxUrl].join("\n"),
    html: section(lang, [heading(lang, title), paragraph(lang, intro), list(lang, lines), button(lang, link, inboxUrl)]),
  });
  const a = part("th", "มีเรื่องร้องเรียนเกินกำหนด", "เรื่องร้องเรียนต่อไปนี้ยังไม่มีผู้รับเรื่องหรือยังแก้ไขไม่เสร็จภายในเวลาที่กำหนด เปิดคิวเรื่องเพื่อดูรายละเอียด", th, "เปิดคิวเรื่อง");
  const b = part("en", "Complaints past their target", "These complaints have not been acknowledged or resolved within their target. Open the queue to see them.", en, "Open the queue");
  return {
    subject,
    text: `${a.text}\n\n---\n\n${b.text}\n`,
    html: emailDocument({ title: subject, lang: "th", sections: [a.html, b.html] }),
  };
}

const PRIVATE_LINK_TH = "ใครมีลิงก์ส่วนตัวก็ดูเรื่องนี้ได้ จึงไม่ควรส่งต่อให้ผู้อื่น";
const PRIVATE_LINK_EN = "Anyone with the private link can see this complaint, so do not share it.";

/** The complaint has been closed, by staff or once the time to reopen it ran out. */
export function complaintClosed({ reference }: ComplaintEmailParams): RenderedEmail {
  return render(
    `ปิดเรื่องร้องเรียนของคุณแล้ว ${reference} / Your complaint is closed ${reference}`,
    {
      lang: "th",
      heading: "ปิดเรื่องร้องเรียนของคุณแล้ว",
      paragraphs: [
        `เจ้าหน้าที่ของ${SERVICE.th}ปิดเรื่องร้องเรียนนี้แล้ว ดูผลที่เจ้าหน้าที่แจ้งได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง`,
        "หากยังไม่ได้บอกเราว่าพอใจกับการดำเนินการหรือไม่ ทำแบบสอบถามสั้น ๆ ได้จากหน้าเดียวกัน",
      ],
      reference: { label: "เลขอ้างอิง", value: reference },
      after: [PRIVATE_LINK_TH],
    },
    {
      lang: "en",
      heading: "Your complaint is closed",
      paragraphs: [
        `Staff at ${SERVICE.en} have closed this complaint. You can read the outcome on the private link you were given when you sent it.`,
        "If you have not yet told us how we did, you can answer a short survey from the same page.",
      ],
      reference: { label: "Your reference", value: reference },
      after: [PRIVATE_LINK_EN],
    },
  );
}

/** The complaint has been reopened. */
export function complaintReopened({ reference }: ComplaintEmailParams): RenderedEmail {
  return render(
    `เปิดเรื่องร้องเรียนของคุณอีกครั้งแล้ว ${reference} / Your complaint is reopened ${reference}`,
    {
      lang: "th",
      heading: "เปิดเรื่องร้องเรียนของคุณอีกครั้งแล้ว",
      paragraphs: [`เจ้าหน้าที่ของ${SERVICE.th}เปิดเรื่องร้องเรียนนี้อีกครั้งและกำลังดำเนินการ`, "ดูความคืบหน้าได้จากลิงก์ส่วนตัวที่คุณได้รับตอนส่งเรื่อง"],
      reference: { label: "เลขอ้างอิง", value: reference },
      after: [PRIVATE_LINK_TH],
    },
    {
      lang: "en",
      heading: "Your complaint is reopened",
      paragraphs: [`Staff at ${SERVICE.en} have reopened this complaint and are looking after it.`, "You can see how it is going from the private link you were given when you sent it."],
      reference: { label: "Your reference", value: reference },
      after: [PRIVATE_LINK_EN],
    },
  );
}

/** The complaint is recorded as withdrawn. */
export function complaintWithdrawn({ reference }: ComplaintEmailParams): RenderedEmail {
  return render(
    `ถอนเรื่องร้องเรียนของคุณแล้ว ${reference} / Your complaint is withdrawn ${reference}`,
    {
      lang: "th",
      heading: "ถอนเรื่องร้องเรียนของคุณแล้ว",
      paragraphs: [`เจ้าหน้าที่ของ${SERVICE.th}บันทึกการถอนเรื่องร้องเรียนนี้แล้ว และจะไม่ดำเนินการต่อ`, "หากคุณไม่ได้ขอให้ถอนเรื่อง โปรดติดต่อเจ้าหน้าที่โดยเร็ว และแจ้งเลขอ้างอิงด้านล่าง"],
      reference: { label: "เลขอ้างอิง", value: reference },
      after: [PRIVATE_LINK_TH],
    },
    {
      lang: "en",
      heading: "Your complaint is withdrawn",
      paragraphs: [`Staff at ${SERVICE.en} have recorded that this complaint is withdrawn, so we will not take it further.`, "If you did not ask for it to be withdrawn, please contact staff straight away and give them the reference below."],
      reference: { label: "Your reference", value: reference },
      after: [PRIVATE_LINK_EN],
    },
  );
}
