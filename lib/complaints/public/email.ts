/**
 * The optional "email me my private link" message. Email is never required: the
 * link is shown on the confirmation page either way, and a failure to send is
 * reported, never fatal. Anonymous complaints hold no address, so they never
 * get this. Thai first and English second in one message.
 */

import { ensureSiteText } from "@/lib/content/site-text";
import { getEmailSender, isEmailConfigured, type EmailMessage } from "@/lib/email";
import { EMAIL_ACCOUNT_TEXT, bothLanguages } from "@/lib/email/strings";
import { fillText } from "@/lib/i18n/editable";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export { isEmailConfigured };

export function trackingLinkEmail(reference: string, link: string): Omit<EmailMessage, "to"> {
  const T = EMAIL_ACCOUNT_TEXT;
  const th = {
    heading: T.cpHeading.th,
    lines: [fillText(T.cpReference.th, { reference }), T.cpLine.th],
    linkLabel: T.cpLinkLabel.th,
    after: [T.cpAfter.th],
  };
  const en = {
    heading: T.cpHeading.en,
    lines: [fillText(T.cpReference.en, { reference }), T.cpLine.en],
    linkLabel: T.cpLinkLabel.en,
    after: [T.cpAfter.en],
  };
  const subject = bothLanguages(T.cpSubject, { reference });
  const text = [th, en].map((s) => [s.heading, "", ...s.lines.flatMap((l) => [l, ""]), s.linkLabel, link, "", ...s.after].join("\n")).join("\n\n---\n\n");
  const section = (lang: "th" | "en", s: typeof th) =>
    `<div lang="${lang}"><h2 style="font-size:20px;margin:0 0 16px">${esc(s.heading)}</h2>${s.lines.map((l) => `<p style="margin:0 0 16px">${esc(l)}</p>`).join("")}<p style="margin:0 0 4px">${esc(s.linkLabel)}</p><p style="margin:0 0 24px"><a href="${esc(link)}" style="color:#1d70b8;word-break:break-all">${esc(link)}</a></p>${s.after.map((l) => `<p style="margin:0 0 16px">${esc(l)}</p>`).join("")}</div>`;
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head><body style="margin:0;padding:24px 16px;background:#ffffff;color:#0b0c0c;font-family:Helvetica,Arial,'Noto Sans Thai',sans-serif;font-size:19px;line-height:1.5"><div style="max-width:600px;margin:0 auto">${section("th", th)}<hr style="border:0;border-top:1px solid #b1b4b6;margin:32px 0">${section("en", en)}</div></body></html>`;
  return { subject, text, html };
}

/** Sends the link. Returns false (never throws) when email is off or the send fails. */
export async function sendTrackingLinkEmail(to: string, reference: string, link: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  await ensureSiteText();
  try {
    await getEmailSender().send({ to, ...trackingLinkEmail(reference, link) });
    return true;
  } catch (error) {
    console.error("[complaints] tracking link email not sent", error instanceof Error ? error.message : error);
    return false;
  }
}
