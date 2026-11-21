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
import { fillText } from "@/lib/i18n/editable";
import type { LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { EMAIL_COMPLAINT_TEXT, bothLanguages } from "./strings";
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

const T = EMAIL_COMPLAINT_TEXT;
const say = (entry: LocaleString, lang: "th" | "en", values: Record<string, string | number> = {}) => fillText(entry[lang], values);
const refLabel = (lang: "th" | "en") => T.refLabel[lang];

/** Staff have acknowledged the complaint. */
export function complaintAcknowledged({ reference }: ComplaintEmailParams): RenderedEmail {
  const sec = (lang: "th" | "en"): Section => ({
    lang,
    heading: T.ackHeading[lang],
    paragraphs: [say(T.ackIntro, lang, { service: SERVICE[lang] }), T.ackHow[lang]],
    reference: { label: refLabel(lang), value: reference },
    after: [T.privateLink[lang]],
  });
  return render(bothLanguages(T.ackSubject, { reference }), sec("th"), sec("en"));
}

/** The complaint has been resolved; the person is asked to look and to say how it went. */
export function complaintResolved({ reference }: ComplaintEmailParams): RenderedEmail {
  const sec = (lang: "th" | "en"): Section => ({
    lang,
    heading: T.resolvedHeading[lang],
    paragraphs: [T.resolvedRead[lang], say(T.resolvedReopen, lang, { days: REOPEN_WINDOW_DAYS })],
    reference: { label: refLabel(lang), value: reference },
    after: [T.privateLink[lang]],
  });
  return render(bothLanguages(T.resolvedSubject, { reference }), sec("th"), sec("en"));
}

export interface RedirectedEmailParams extends ComplaintEmailParams {
  target: RedirectTarget;
}

const instagramOf = (body: FacultyBody): string[] => body.contacts.filter((c) => c.channel === "instagram").map((c) => `@${c.value}`);

/** The office details an editor has filled in, one line each. Empty when none are. */
function officeLines(office: FacultyOffice, lang: "th" | "en"): string[] {
  const label = { where: T.officeWhere[lang], phone: T.officePhone[lang], email: T.officeEmail[lang], web: T.officeWeb[lang] };
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
    out.push(T.courseMatter[lang]);
    out.push(T.courseContact[lang]);
  } else {
    out.push(T.facultyMatter[lang]);
    if (bodies.length > 0) out.push(`${T.studentBodies[lang]}:`);
    for (const body of bodies) {
      const handles = instagramOf(body);
      const programme = body.programme?.[lang];
      out.push([body.name[lang] || body.name[th ? "en" : "th"], programme ? say(T.programme, lang, { programme }) : "", handles.length ? `Instagram: ${handles.join(", ")}` : ""].filter(Boolean).join(" "));
    }
  }
  if (faculty) {
    const lines = officeLines(faculty.office, lang);
    out.push(`${T.facultyOffice[lang]}: ${faculty.name[lang] || faculty.name[th ? "en" : "th"]}`);
    if (lines.length > 0) out.push(...lines);
    else out.push(T.noOfficeDetails[lang]);
  } else {
    out.push(T.askFaculty[lang]);
  }
  return out;
}

/** The complaint is outside the union's remit and has been closed as redirected; says who to contact instead. */
export function complaintRedirected({ reference, target }: RedirectedEmailParams): RenderedEmail {
  const sec = (lang: "th" | "en"): Section => ({
    lang,
    heading: T.redirectHeading[lang],
    paragraphs: [say(T.redirectIntro, lang, { service: SERVICE[lang] }), ...redirectParagraphs(target, lang)],
    reference: { label: refLabel(lang), value: reference },
    after: [T.redirectAfter[lang]],
  });
  return render(bothLanguages(T.redirectSubject, { reference }), sec("th"), sec("en"));
}

export interface EscalationEmailParams {
  /** References only. The email never says what a complaint is about. */
  items: Array<{ reference: string; reason: "acknowledge" | "resolve" }>;
  /** Where staff open the queue. */
  inboxUrl: string;
}

/** To an officer: complaints that have missed a target. Staff-facing, so it also names the target. */
export function complaintsEscalated({ items, inboxUrl }: EscalationEmailParams): RenderedEmail {
  const lines = (lang: "th" | "en") => items.map((i) => `${i.reference}: ${(i.reason === "acknowledge" ? T.escNotAcknowledged : T.escNotResolved)[lang]}`);
  const th = lines("th");
  const en = lines("en");
  const subject = bothLanguages(items.length === 1 ? T.escSubjectOne : T.escSubject, { count: items.length });
  const part = (lang: "th" | "en", title: string, intro: string, lines: string[], link: string) => ({
    text: [title, "", intro, "", ...lines.map((l) => `- ${l}`), "", link, inboxUrl].join("\n"),
    html: section(lang, [heading(lang, title), paragraph(lang, intro), list(lang, lines), button(lang, link, inboxUrl)]),
  });
  const a = part("th", T.escTitle.th, T.escIntro.th, th, T.escLink.th);
  const b = part("en", T.escTitle.en, T.escIntro.en, en, T.escLink.en);
  return {
    subject,
    text: `${a.text}\n\n---\n\n${b.text}\n`,
    html: emailDocument({ title: subject, lang: "th", sections: [a.html, b.html] }),
  };
}

/** The complaint has been closed, by staff or once the time to reopen it ran out. */
export function complaintClosed({ reference }: ComplaintEmailParams): RenderedEmail {
  const sec = (lang: "th" | "en"): Section => ({
    lang,
    heading: T.closedHeading[lang],
    paragraphs: [say(T.closedIntro, lang, { service: SERVICE[lang] }), T.closedSurvey[lang]],
    reference: { label: refLabel(lang), value: reference },
    after: [T.privateLink[lang]],
  });
  return render(bothLanguages(T.closedSubject, { reference }), sec("th"), sec("en"));
}

/** The complaint has been reopened. */
export function complaintReopened({ reference }: ComplaintEmailParams): RenderedEmail {
  const sec = (lang: "th" | "en"): Section => ({
    lang,
    heading: T.reopenedHeading[lang],
    paragraphs: [say(T.reopenedIntro, lang, { service: SERVICE[lang] }), T.reopenedHow[lang]],
    reference: { label: refLabel(lang), value: reference },
    after: [T.privateLink[lang]],
  });
  return render(bothLanguages(T.reopenedSubject, { reference }), sec("th"), sec("en"));
}

/** The complaint is recorded as withdrawn. */
export function complaintWithdrawn({ reference }: ComplaintEmailParams): RenderedEmail {
  const sec = (lang: "th" | "en"): Section => ({
    lang,
    heading: T.withdrawnHeading[lang],
    paragraphs: [say(T.withdrawnIntro, lang, { service: SERVICE[lang] }), T.withdrawnAsk[lang]],
    reference: { label: refLabel(lang), value: reference },
    after: [T.privateLink[lang]],
  });
  return render(bothLanguages(T.withdrawnSubject, { reference }), sec("th"), sec("en"));
}
