/**
 * Emails for the equipment borrowing service. Same conventions as
 * lib/email/templates.ts: Thai first and English second in one message, plain
 * sentences, the reference on its own line. This one carries the private
 * tracking link and the reference only: never the items, the event or any
 * personal detail, because a mailbox may be shared.
 */

import { UI } from "@/lib/i18n/strings";
import { fillText } from "@/lib/i18n/editable";
import { EMAIL_ACCOUNT_TEXT } from "./strings";
import { button, emailDocument, heading, paragraph, section } from "./layout";
import type { RenderedEmail } from "./templates";

interface Section {
  lang: "th" | "en";
  heading: string;
  lines: string[];
  linkLabel: string;
  after: string[];
}

export interface BorrowingTrackingLinkParams {
  reference: string;
  link: string;
}

/** The private link to track a loan request, sent when the borrower asks for it on the confirmation page. */
export function borrowingTrackingLink({ reference, link }: BorrowingTrackingLinkParams): RenderedEmail {
  const T = EMAIL_ACCOUNT_TEXT;
  const th: Section = {
    lang: "th",
    heading: T.borrowTrackHeading.th,
    lines: [fillText(T.borrowTrackReference.th, { reference }), T.borrowTrackLine.th],
    linkLabel: T.borrowTrackLinkLabel.th,
    after: [T.borrowTrackAfter.th],
  };
  const en: Section = {
    lang: "en",
    heading: T.borrowTrackHeading.en,
    lines: [fillText(T.borrowTrackReference.en, { reference }), T.borrowTrackLine.en],
    linkLabel: T.borrowTrackLinkLabel.en,
    after: [T.borrowTrackAfter.en],
  };
  const subject = `${UI.brServiceName.th}: ${reference} / ${UI.brServiceName.en}: ${reference}`;
  const text = [th, en].map((s) => [s.heading, "", ...s.lines.flatMap((l) => [l, ""]), s.linkLabel, link, "", ...s.after].join("\n")).join("\n\n---\n\n");
  const render = (s: Section) =>
    section(s.lang, [heading(s.lang, s.heading), ...s.lines.map((t) => paragraph(s.lang, t)), button(s.lang, s.linkLabel, link), ...s.after.map((t) => paragraph(s.lang, t))]);
  const html = emailDocument({ title: subject, lang: "th", sections: [render(th), render(en)], preheader: th.lines[0] });
  return { subject, text, html };
}
