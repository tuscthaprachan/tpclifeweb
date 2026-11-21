/**
 * The email that goes with a console notification. Thai first, English second,
 * like every other email. It carries the kind of notice, the case reference
 * where there is one, and a link into the console; never a name, a contact
 * detail or anything a member of the public wrote.
 */

import type { LocaleString } from "@/lib/i18n/config";
import { fillText } from "@/lib/i18n/editable";
import { UI } from "@/lib/i18n/strings";
import { EMAIL_STAFF_NOTICE_TEXT } from "./strings";
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
  title: LocaleString;
  line: (ref: string) => Copy;
}

const T = EMAIL_STAFF_NOTICE_TEXT;

/** A line that names the case when there is a reference and says it generally when there is not. */
const withRef = (withRefText: LocaleString, withoutRefText: LocaleString) => (ref: string): Copy => ({
  th: ref ? fillText(withRefText.th, { reference: ref }) : withoutRefText.th,
  en: ref ? fillText(withRefText.en, { reference: ref }) : withoutRefText.en,
});

/** Built on each call, so a change in the console shows in the next email. */
function kinds(): Record<string, Entry> {
  return {
    case_assigned: { title: T.caseAssignedTitle, line: withRef(T.caseAssignedRef, T.caseAssignedNoRef) },
    case_mention: { title: T.caseMentionTitle, line: withRef(T.caseMentionRef, T.caseMentionNoRef) },
    complaint_escalated: { title: T.complaintEscalatedTitle, line: withRef(T.complaintEscalatedRef, T.complaintEscalatedNoRef) },
    borrowing_overdue: { title: T.borrowingOverdueTitle, line: withRef(T.borrowingOverdueRef, T.borrowingOverdueNoRef) },
    invite_accepted: { title: T.inviteAcceptedTitle, line: () => ({ th: T.inviteAcceptedLine.th, en: T.inviteAcceptedLine.en }) },
  };
}

const fallback = (): Entry => ({ title: T.fallbackTitle, line: () => ({ th: T.fallbackLine.th, en: T.fallbackLine.en }) });

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
  const table = kinds();
  const entry = Object.hasOwn(table, kind) ? table[kind]! : fallback();
  const line = entry.line(cleanReference(reference));
  const subject = `${entry.title.th} / ${entry.title.en}`;
  const th = block("th", entry.title.th, fillText(T.onService.th, { line: line.th, service: UI.serviceName.th }), T.openLabel.th, url);
  const en = block("en", entry.title.en, fillText(T.onService.en, { line: line.en, service: UI.serviceName.en }), T.openLabel.en, url);
  const text = `${th.text}\n\n---\n\n${en.text}\n`;
  const html = emailDocument({ title: subject, lang: "th", sections: [th.html, en.html], preheader: line.th });
  return { subject, text, html };
}
