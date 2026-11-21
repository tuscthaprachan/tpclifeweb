/**
 * The optional "email me my private link" message. Email is never required:
 * the link is shown on the confirmation page either way, and a failure to send
 * is reported, never fatal. Thai first and English second in one message, in
 * the plain style of the other service emails (lib/email/templates.ts).
 */

import { ensureSiteText } from "@/lib/content/site-text";
import { getEmailSender, isEmailConfigured, type EmailMessage } from "@/lib/email";
import { button, emailDocument, heading, paragraph, reference as referenceBlock, section } from "@/lib/email/layout";
import { EMAIL_ACCOUNT_TEXT, bothLanguages } from "@/lib/email/strings";
import type { JourneyKind } from "./steps";

export { isEmailConfigured };

export function trackingLinkEmail(kind: JourneyKind, reference: string, link: string): Omit<EmailMessage, "to"> {
  const claim = kind === "claim";
  const T = EMAIL_ACCOUNT_TEXT;
  const th = {
    heading: (claim ? T.lfClaimHeading : T.lfReportHeading).th,
    line: T.lfLine.th,
    referenceLabel: T.lfReferenceLabel.th,
    linkLabel: T.lfLinkLabel.th,
    after: T.lfAfter.th,
  };
  const en = {
    heading: (claim ? T.lfClaimHeading : T.lfReportHeading).en,
    line: T.lfLine.en,
    referenceLabel: T.lfReferenceLabel.en,
    linkLabel: T.lfLinkLabel.en,
    after: T.lfAfter.en,
  };
  const subject = bothLanguages(claim ? T.lfClaimSubject : T.lfReportSubject, { reference });
  const text = [th, en].map((s) => [s.heading, "", s.referenceLabel, reference, "", s.line, "", s.linkLabel, link, "", s.after].join("\n")).join("\n\n---\n\n");
  const html = emailDocument({
    title: subject,
    lang: "th",
    preheader: th.line,
    sections: [
      section("th", [heading("th", th.heading), referenceBlock("th", th.referenceLabel, reference), paragraph("th", th.line), button("th", th.linkLabel, link), paragraph("th", th.after)]),
      section("en", [heading("en", en.heading), referenceBlock("en", en.referenceLabel, reference), paragraph("en", en.line), button("en", en.linkLabel, link), paragraph("en", en.after)]),
    ],
  });
  return { subject, text, html };
}

/** Sends the link. Returns false (never throws) when email is off or the send fails. */
export async function sendTrackingLinkEmail(to: string, kind: JourneyKind, reference: string, link: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  await ensureSiteText();
  try {
    await getEmailSender().send({ to, ...trackingLinkEmail(kind, reference, link) });
    return true;
  } catch (error) {
    console.error("[lost-found] tracking link email not sent", error instanceof Error ? error.message : error);
    return false;
  }
}
