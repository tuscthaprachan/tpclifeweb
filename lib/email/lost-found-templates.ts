/**
 * Emails to a person who reported something lost, sent from the staff
 * console when their report moves on. Same conventions as lib/email/templates.ts:
 * Thai first and English second in one message, plain sentences, the one thing
 * the reader needs on its own line. They carry the reference and the desk,
 * never a description of the item or any personal detail, and they ask the
 * person to bring their student card or other photo ID when collecting.
 */

import { fillText } from "@/lib/i18n/editable";
import { UI } from "@/lib/i18n/strings";
import { EMAIL_LOST_FOUND_TEXT, bothLanguages } from "./strings";
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

const T = EMAIL_LOST_FOUND_TEXT;
type Lang = "th" | "en";
const say = (entry: LocaleString, lang: Lang, values: Record<string, string | number> = {}) => fillText(entry[lang], values);
const deskOf = (desk: LocaleString | null | undefined, lang: Lang) => (desk ? say(T.deskAt, lang, { desk: desk[lang] }) : T.deskDefault[lang]);

/** The reporter has a possible match. */
export function lostReportPossibleMatch({ reference, desk }: LostReportEmailParams): RenderedEmail {
  const sec = (lang: Lang): Section => ({
    lang,
    heading: T.matchHeading[lang],
    paragraphs: [say(T.matchIntro, lang, { service: SERVICE[lang] }), say(T.matchContact, lang, { desk: deskOf(desk, lang) })],
    reference: { label: T.yourReference[lang], value: reference },
    after: [T.noForward[lang]],
  });
  return render(bothLanguages(T.matchSubject, { reference }), sec("th"), sec("en"));
}

/** The match is confirmed and the item waits at the desk. */
export function lostReportReadyToCollect({ reference, desk }: LostReportEmailParams): RenderedEmail {
  const sec = (lang: Lang): Section => ({
    lang,
    heading: T.readyHeading[lang],
    paragraphs: [say(T.readyIntro, lang, { desk: deskOf(desk, lang) }), T.bringId[lang]],
    reference: { label: T.yourReference[lang], value: reference },
    after: [T.cannotCome[lang]],
  });
  return render(bothLanguages(T.readySubject, { reference }), sec("th"), sec("en"));
}

/** The item has been handed back. */
export function lostReportReturned({ reference }: LostReportEmailParams): RenderedEmail {
  const sec = (lang: Lang): Section => ({
    lang,
    heading: T.returnedHeading[lang],
    paragraphs: [say(T.returnedIntro, lang, { service: SERVICE[lang] })],
    reference: { label: T.yourReference[lang], value: reference },
    after: [T.returnedAfter[lang]],
  });
  return render(bothLanguages(T.returnedSubject, { reference }), sec("th"), sec("en"));
}

/** The claim on the found item that matched the reporter's report was not accepted. */
export function lostReportClaimDeclined({ reference, desk }: LostReportEmailParams): RenderedEmail {
  const sec = (lang: Lang): Section => ({
    lang,
    heading: T.reportDeclinedHeading[lang],
    paragraphs: [say(T.reportDeclinedIntro, lang, { service: SERVICE[lang] }), say(T.reportDeclinedOpen, lang, { desk: deskOf(desk, lang) })],
    reference: { label: T.yourReference[lang], value: reference },
    after: [T.noForward[lang]],
  });
  return render(bothLanguages(T.reportDeclinedSubject, { reference }), sec("th"), sec("en"));
}

export interface ClaimEmailParams {
  /** The found item's reference, which the claimant was given when they made the claim. */
  reference: string;
  desk?: LocaleString | null;
}

/** The claimant's claim was accepted and the item waits at the desk. */
export function claimAccepted({ reference, desk }: ClaimEmailParams): RenderedEmail {
  const sec = (lang: Lang): Section => ({
    lang,
    heading: T.claimAcceptedHeading[lang],
    paragraphs: [say(T.claimAcceptedIntro, lang, { service: SERVICE[lang], desk: deskOf(desk, lang) }), T.bringId[lang]],
    reference: { label: T.reference[lang], value: reference },
    after: [T.cannotCome[lang]],
  });
  return render(bothLanguages(T.claimAcceptedSubject, { reference }), sec("th"), sec("en"));
}

/** The claimant's claim was not accepted. */
export function claimDeclined({ reference, desk }: ClaimEmailParams): RenderedEmail {
  const sec = (lang: Lang): Section => ({
    lang,
    heading: T.claimDeclinedHeading[lang],
    paragraphs: [say(T.claimDeclinedIntro, lang, { service: SERVICE[lang] }), say(T.claimDeclinedMore, lang, { desk: deskOf(desk, lang) })],
    reference: { label: T.reference[lang], value: reference },
    after: [T.noForward[lang]],
  });
  return render(bothLanguages(T.claimDeclinedSubject, { reference }), sec("th"), sec("en"));
}
