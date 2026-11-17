/**
 * The email that goes with a console notification. Thai first, English second,
 * like every other email. It carries the kind of notice, the case reference
 * where there is one, and a link into the console; never a name, a contact
 * detail or anything a member of the public wrote.
 */

import { UI } from "@/lib/i18n/strings";
import { button, emailDocument, heading as h, paragraph, section } from "./layout";
import type { RenderedEmail } from "./templates";

export interface StaffNotificationParams {
  kind: string;
  reference?: string | null;
  url: string;
}

interface Copy {
  th: string;
  en: string;
}

interface Entry {
  title: Copy;
  line: (ref: string) => Copy;
}

const KIND: Record<string, Entry> = {
  case_assigned: {
    title: { th: "มีเคสมอบหมายให้คุณ", en: "A case has been assigned to you" },
    line: (ref) => ({ th: ref ? `เคส ${ref} ถูกมอบหมายให้คุณ` : "มีเคสถูกมอบหมายให้คุณ", en: ref ? `Case ${ref} has been assigned to you.` : "A case has been assigned to you." }),
  },
  case_mention: {
    title: { th: "มีการกล่าวถึงคุณในบันทึก", en: "You were mentioned in a note" },
    line: (ref) => ({ th: ref ? `มีการกล่าวถึงคุณในบันทึกภายในของเคส ${ref}` : "มีการกล่าวถึงคุณในบันทึกภายในของเคส", en: ref ? `You were mentioned in an internal note on case ${ref}.` : "You were mentioned in an internal note on a case." }),
  },
  complaint_escalated: {
    title: { th: "เรื่องร้องเรียนถูกเลื่อนระดับ", en: "A complaint has been escalated" },
    line: (ref) => ({ th: ref ? `เรื่องร้องเรียน ${ref} เกินกำหนดและถูกเลื่อนระดับ` : "มีเรื่องร้องเรียนเกินกำหนดและถูกเลื่อนระดับ", en: ref ? `Complaint ${ref} is overdue and has been escalated.` : "A complaint is overdue and has been escalated." }),
  },
  borrowing_overdue: {
    title: { th: "มีอุปกรณ์เกินกำหนดคืน", en: "Borrowed equipment is overdue" },
    line: (ref) => ({ th: ref ? `การยืม ${ref} เกินกำหนดคืนแล้ว` : "มีการยืมที่เกินกำหนดคืนแล้ว", en: ref ? `Loan ${ref} is past its return time.` : "A loan is past its return time." }),
  },
  invite_accepted: {
    title: { th: "คำเชิญของคุณได้รับการตอบรับ", en: "Your invitation was accepted" },
    line: () => ({ th: "มีผู้ตอบรับคำเชิญที่คุณส่งไว้", en: "Someone you invited has accepted and joined the team." }),
  },
};

const FALLBACK: Entry = {
  title: { th: "มีการแจ้งเตือนใหม่", en: "You have a new notification" },
  line: () => ({ th: "มีการแจ้งเตือนใหม่ในคอนโซลเจ้าหน้าที่", en: "You have a new notification in the staff console." }),
};

function assertHttps(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Email link must be an absolute URL.");
  }
  if (parsed.protocol !== "https:") throw new Error("Email link must be https.");
}

function cleanReference(reference: string | null | undefined): string {
  return typeof reference === "string" && /^[A-Za-z0-9-]{1,40}$/.test(reference) ? reference : "";
}

function block(lang: "th" | "en", title: string, line: string, label: string, url: string): { text: string; html: string } {
  const text = [title, "", line, "", label, url].join("\n");
  const html = section(lang, [h(lang, title), paragraph(lang, line), button(lang, label, url)]);
  return { text, html };
}

export function staffNotification({ kind, reference, url }: StaffNotificationParams): RenderedEmail {
  assertHttps(url);
  const entry = Object.hasOwn(KIND, kind) ? KIND[kind]! : FALLBACK;
  const line = entry.line(cleanReference(reference));
  const subject = `${entry.title.th} / ${entry.title.en}`;
  const th = block("th", entry.title.th, `${line.th} บน${UI.serviceName.th}`, "เปิดในคอนโซล", url);
  const en = block("en", entry.title.en, `${line.en} On ${UI.serviceName.en}.`, "Open in the console", url);
  const text = `${th.text}\n\n---\n\n${en.text}\n`;
  const html = emailDocument({ title: subject, lang: "th", sections: [th.html, en.html], preheader: line.th });
  return { subject, text, html };
}
