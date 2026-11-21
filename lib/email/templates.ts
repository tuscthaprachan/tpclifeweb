/**
 * Email templates, in code.
 *
 * Every email carries Thai first and English second in the same message,
 * because the recipient may read either and we cannot know which. Style
 * follows GOV.UK Notify: plain, no images, a clear subject, the one thing the
 * reader needs (link, reference) set out on its own line, and short
 * sentences. Thai is written as Thai, not translated from the English.
 *
 * HTML comes from ./layout: inline styles only, Sarabun for Thai and Lexend
 * for English, `lang` on each half so screen readers switch voice.
 */

import { UI } from "@/lib/i18n/strings";
import type { LocaleString } from "@/lib/i18n/config";
import { fillText } from "@/lib/i18n/editable";
import { EMAIL_ACCOUNT_TEXT, bothLanguages } from "./strings";
import { button, emailDocument, heading, paragraph, reference, section } from "./layout";

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

/** One language's worth of an email. `highlight` is the link or reference to set apart. */
interface Section {
  lang: "th" | "en";
  heading: string;
  paragraphs: string[];
  highlight?: { label: string; value: string; isLink?: boolean };
  after: string[];
}

const SERVICE: LocaleString = UI.serviceName;

function assertHttpUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Email link must be an absolute URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Email link must be http or https.");
  }
}

function sectionText(s: Section): string {
  const lines = [s.heading, "", ...s.paragraphs.flatMap((p) => [p, ""])];
  if (s.highlight) lines.push(s.highlight.label, s.highlight.value, "");
  lines.push(...s.after.flatMap((p) => [p, ""]));
  return lines.join("\n").trimEnd();
}

function sectionHtml(s: Section): string {
  const highlight = s.highlight
    ? s.highlight.isLink
      ? button(s.lang, s.highlight.label, s.highlight.value)
      : reference(s.lang, s.highlight.label, s.highlight.value)
    : "";
  return section(s.lang, [
    heading(s.lang, s.heading),
    ...s.paragraphs.map((t) => paragraph(s.lang, t)),
    highlight,
    ...s.after.map((t) => paragraph(s.lang, t)),
  ]);
}

function render(subject: string, th: Section, en: Section): RenderedEmail {
  const text = `${sectionText(th)}\n\n---\n\n${sectionText(en)}\n`;
  const html = emailDocument({ title: subject, lang: "th", sections: [sectionHtml(th), sectionHtml(en)], preheader: th.paragraphs[0] });
  return { subject, text, html };
}

export interface StaffInviteParams {
  inviterName: string;
  organisation: LocaleString;
  acceptUrl: string;
  expiresInDays: number;
}

export function staffInvite({ inviterName, organisation, acceptUrl, expiresInDays }: StaffInviteParams): RenderedEmail {
  assertHttpUrl(acceptUrl);
  const n = Math.max(1, Math.round(expiresInDays));
  const T = EMAIL_ACCOUNT_TEXT;
  const subject = bothLanguages(T.inviteSubject, { organisation: organisation.th }, { organisation: organisation.en });
  return render(
    subject,
    {
      lang: "th",
      heading: T.inviteHeading.th,
      paragraphs: [
        fillText(T.inviteIntro.th, { inviter: inviterName, organisation: organisation.th, service: SERVICE.th }),
        T.inviteHow.th,
      ],
      highlight: { label: T.inviteLink.th, value: acceptUrl, isLink: true },
      after: [
        fillText(T.inviteExpiresDay.th, { n }),
        T.inviteNoForward.th,
        T.inviteIgnore.th,
      ],
    },
    {
      lang: "en",
      heading: T.inviteHeading.en,
      paragraphs: [
        fillText(T.inviteIntro.en, { inviter: inviterName, organisation: organisation.en, service: SERVICE.en }),
        T.inviteHow.en,
      ],
      highlight: { label: T.inviteLink.en, value: acceptUrl, isLink: true },
      after: [
        fillText((n === 1 ? T.inviteExpiresDay : T.inviteExpiresDays).en, { n }),
        T.inviteNoForward.en,
        T.inviteIgnore.en,
      ],
    },
  );
}

export interface StaffRecoveryParams {
  organisation: LocaleString;
  recoverUrl: string;
  expiresInHours: number;
}

export function staffRecovery({ organisation, recoverUrl, expiresInHours }: StaffRecoveryParams): RenderedEmail {
  assertHttpUrl(recoverUrl);
  const n = Math.max(1, Math.round(expiresInHours));
  const T = EMAIL_ACCOUNT_TEXT;
  const subject = bothLanguages(T.recoverySubject, { service: SERVICE.th }, { service: SERVICE.en });
  return render(
    subject,
    {
      lang: "th",
      heading: T.recoveryHeading.th,
      paragraphs: [
        fillText(T.recoveryIntro.th, { organisation: organisation.th, service: SERVICE.th }),
        T.recoveryHow.th,
      ],
      highlight: { label: T.recoveryLink.th, value: recoverUrl, isLink: true },
      after: [
        fillText(T.recoveryExpiresHour.th, { n }),
        T.recoveryNoForward.th,
        T.recoveryIgnore.th,
      ],
    },
    {
      lang: "en",
      heading: T.recoveryHeading.en,
      paragraphs: [
        fillText(T.recoveryIntro.en, { organisation: organisation.en, service: SERVICE.en }),
        T.recoveryHow.en,
      ],
      highlight: { label: T.recoveryLink.en, value: recoverUrl, isLink: true },
      after: [
        fillText((n === 1 ? T.recoveryExpiresHour : T.recoveryExpiresHours).en, { n }),
        T.recoveryNoForward.en,
        T.recoveryIgnore.en,
      ],
    },
  );
}
