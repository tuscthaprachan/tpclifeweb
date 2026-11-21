/**
 * Emails for the equipment borrowing service: the decision, a reminder the
 * working day before a return, and one overdue notice. Same conventions as
 * lib/email/complaint-templates.ts: both languages in one message, plain
 * sentences, the reference on its own line. The borrower's language comes
 * first. They never carry the event, the group, the items or any personal
 * detail, because a mailbox may be shared; they point to the private link.
 */

import { DESK_CLOSES, DESK_OPENS } from "@/lib/borrowing/constants";
import type { Locale, LocaleString } from "@/lib/i18n/config";
import { fillText } from "@/lib/i18n/editable";
import { formatDateTime } from "@/lib/i18n/format";
import { UI } from "@/lib/i18n/strings";
import { EMAIL_LOAN_TEXT } from "./strings";
import { emailDocument, heading, paragraph, reference, section } from "./layout";
import type { RenderedEmail } from "./templates";

interface Section {
  lang: Locale;
  heading: string;
  paragraphs: string[];
  reference: { label: string; value: string };
  after: string[];
}

function sectionText(s: Section): string {
  return [s.heading, "", ...s.paragraphs.flatMap((p) => [p, ""]), s.reference.label, s.reference.value, "", ...s.after.flatMap((p) => [p, ""])].join("\n").trimEnd();
}

function sectionHtml(s: Section): string {
  const p = (t: string) => paragraph(s.lang, t, { preLine: true });
  return section(s.lang, [heading(s.lang, s.heading), ...s.paragraphs.map(p), reference(s.lang, s.reference.label, s.reference.value), ...s.after.map(p)]);
}

/** Renders the two halves, the borrower's language first. */
function render(subject: { th: string; en: string }, th: Section, en: Section, first: Locale): RenderedEmail {
  const [one, two] = first === "en" ? [en, th] : [th, en];
  const title = first === "en" ? `${subject.en} / ${subject.th}` : `${subject.th} / ${subject.en}`;
  const text = `${sectionText(one)}\n\n---\n\n${sectionText(two)}\n`;
  const html = emailDocument({ title, lang: first, sections: [sectionHtml(one), sectionHtml(two)], preheader: one.paragraphs[0] });
  return { subject: title, text, html };
}

const SERVICE = UI.serviceName;
const T = EMAIL_LOAN_TEXT;
const say = (entry: LocaleString, lang: Locale, values: Record<string, string | number> = {}) => fillText(entry[lang], values);
const subjectOf = (entry: LocaleString, reference: string) => ({ th: say(entry, "th", { reference }), en: say(entry, "en", { reference }) });
const hoursText = () => `${DESK_OPENS} - ${DESK_CLOSES}`;

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

/** A plain section: heading, paragraphs, the reference and the private-link note. */
function sectionFor(lang: Locale, heading: string, paragraphs: string[], reference: string): Section {
  return { lang, heading, paragraphs, reference: { label: T.reference[lang], value: reference }, after: [T.privateLink[lang]] };
}

/** The request was approved: when to collect, what to bring, when to return. */
export function loanApproved({ reference, locale, collectAt, returnDueAt, cards }: LoanApprovedParams): RenderedEmail {
  const hours = hoursText();
  const sec = (lang: Locale) =>
    sectionFor(
      lang,
      T.approvedHeading[lang],
      [
        say(T.approvedIntro, lang, { service: SERVICE[lang], collectAt: formatDateTime(collectAt, lang), returnBy: formatDateTime(returnDueAt, lang) }),
        cards > 0 ? say(cards === 1 ? T.approvedDepositOne : T.approvedDepositMany, lang, { cards }) : T.approvedShowId[lang],
        say(T.approvedHours, lang, { hours }),
      ],
      reference,
    );
  return render(subjectOf(T.approvedSubject, reference), sec("th"), sec("en"), locale ?? "th");
}

export interface LoanDeclinedParams extends LoanEmailParams {
  /** Staff's reason, in the languages they wrote it in. Shown as written. */
  reason: { th?: string | null; en?: string | null };
}

/** The request was not approved, with the reason. */
export function loanDeclined({ reference, locale, reason }: LoanDeclinedParams): RenderedEmail {
  const th = reason.th?.trim() || reason.en?.trim() || "";
  const en = reason.en?.trim() || reason.th?.trim() || "";
  const sec = (lang: Locale, why: string) => sectionFor(lang, T.declinedHeading[lang], [say(T.declinedIntro, lang, { service: SERVICE[lang] }), why, T.newRequest[lang]], reference);
  return render(subjectOf(T.declinedSubject, reference), sec("th", th), sec("en", en), locale ?? "th");
}

export interface LoanDueParams extends LoanEmailParams {
  returnDueAt: Date;
}

/** The working day before the return is due. */
export function loanReminder({ reference, locale, returnDueAt }: LoanDueParams): RenderedEmail {
  const hours = hoursText();
  const sec = (lang: Locale) =>
    sectionFor(lang, T.reminderHeading[lang], [say(T.reminderDue, lang, { returnBy: formatDateTime(returnDueAt, lang) }), say(T.reminderHours, lang, { hours })], reference);
  return render(subjectOf(T.reminderSubject, reference), sec("th"), sec("en"), locale ?? "th");
}

/** Once, when the return time has passed and the equipment is still out. */
export function loanOverdue({ reference, locale, returnDueAt }: LoanDueParams): RenderedEmail {
  const hours = hoursText();
  const sec = (lang: Locale) =>
    sectionFor(lang, T.overdueHeading[lang], [say(T.overdueDue, lang, { returnBy: formatDateTime(returnDueAt, lang) }), say(T.overdueHours, lang, { hours })], reference);
  return render(subjectOf(T.overdueSubject, reference), sec("th"), sec("en"), locale ?? "th");
}

/** Everything came back and the loan is closed. */
export function loanReturned({ reference, locale }: LoanEmailParams): RenderedEmail {
  const sec = (lang: Locale) => sectionFor(lang, T.returnedHeading[lang], [say(T.returnedIntro, lang, { service: SERVICE[lang] }), T.returnedCard[lang]], reference);
  return render(subjectOf(T.returnedSubject, reference), sec("th"), sec("en"), locale ?? "th");
}

/** A loan that had a problem on return has been settled and closed. */
export function loanSettled({ reference, locale }: LoanEmailParams): RenderedEmail {
  const sec = (lang: Locale) => sectionFor(lang, T.settledHeading[lang], [say(T.settledIntro, lang, { service: SERVICE[lang] }), T.settledSee[lang]], reference);
  return render(subjectOf(T.settledSubject, reference), sec("th"), sec("en"), locale ?? "th");
}

/** The request was approved but the equipment was not collected, so it was closed. */
export function loanNotCollected({ reference, locale }: LoanEmailParams): RenderedEmail {
  const sec = (lang: Locale) => sectionFor(lang, T.notCollectedHeading[lang], [say(T.notCollectedIntro, lang, { service: SERVICE[lang] }), T.newRequest[lang]], reference);
  return render(subjectOf(T.notCollectedSubject, reference), sec("th"), sec("en"), locale ?? "th");
}

/** Staff cancelled the request, with the reason. */
export function loanCancelled({ reference, locale, reason }: LoanDeclinedParams): RenderedEmail {
  const th = reason.th?.trim() || reason.en?.trim() || "";
  const en = reason.en?.trim() || reason.th?.trim() || "";
  const sec = (lang: Locale, why: string) => sectionFor(lang, T.cancelledHeading[lang], [say(T.cancelledIntro, lang, { service: SERVICE[lang] }), why, T.newRequest[lang]], reference);
  return render(subjectOf(T.cancelledSubject, reference), sec("th", th), sec("en", en), locale ?? "th");
}
