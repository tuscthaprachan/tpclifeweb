/**
 * Shared HTML layout for every email. Table based with inline styles so it
 * holds up in Outlook and Gmail. Thai is set in Sarabun and English in Lexend,
 * loaded from Google Fonts where the client allows it, with system fallbacks
 * where it does not. Colours come from styles/tokens.css.
 */

export type EmailLang = "th" | "en";

const C = {
  page: "#fef8f4",
  card: "#ffffff",
  line: "#e2dcde",
  ink: "#1f1a1c",
  ink2: "#554f51",
  ink3: "#6d6769",
  action: "#613f87",
  actionInk: "#ffffff",
  accent: "#843a01",
  bandFrom: "#fbe4d7",
  bandTo: "#f0e4f9",
};

const FONT: Record<EmailLang, string> = {
  th: "'Sarabun','Leelawadee UI','Thonburi',Tahoma,sans-serif",
  en: "'Lexend','Segoe UI',Helvetica,Arial,'Sarabun',sans-serif",
};
const MONO = "ui-monospace,'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
const LEADING: Record<EmailLang, string> = { th: "1.75", en: "1.6" };

const LANG_NAME: Record<EmailLang, string> = { th: "ภาษาไทย", en: "English" };
const COPY_LINK: Record<EmailLang, string> = {
  th: "หากปุ่มใช้ไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์",
  en: "If the button does not work, copy this link into your browser:",
};

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap";

export const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const text = (lang: EmailLang, size: number, colour = C.ink) =>
  `font-family:${FONT[lang]};font-size:${size}px;line-height:${LEADING[lang]};color:${colour}`;

export function heading(lang: EmailLang, value: string): string {
  return `<h1 style="margin:0 0 16px;${text(lang, 24)};line-height:1.35;font-weight:600">${esc(value)}</h1>`;
}

export function paragraph(lang: EmailLang, value: string, opts: { preLine?: boolean } = {}): string {
  return `<p style="margin:0 0 16px;${text(lang, 17)}${opts.preLine ? ";white-space:pre-line" : ""}">${esc(value)}</p>`;
}

export function reference(lang: EmailLang, label: string, value: string): string {
  return [
    `<p style="margin:8px 0 4px;${text(lang, 15, C.ink2)};font-weight:500">${esc(label)}</p>`,
    `<p style="margin:0 0 24px;font-family:${MONO};font-size:30px;line-height:1.3;letter-spacing:2px;font-weight:700;color:${C.ink}">${esc(value)}</p>`,
  ].join("");
}

export function button(lang: EmailLang, label: string, url: string): string {
  const href = esc(url);
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px;border-collapse:separate">`,
    `<tr><td bgcolor="${C.action}" style="background:${C.action};border-radius:12px">`,
    `<a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;${text(lang, 17, C.actionInk)};line-height:1.4;font-weight:600;text-decoration:none;border-radius:12px">${esc(label)}</a>`,
    `</td></tr></table>`,
    `<p style="margin:0 0 4px;${text(lang, 14, C.ink3)}">${esc(COPY_LINK[lang])}</p>`,
    `<p style="margin:0 0 24px;font-family:${MONO};font-size:13px;line-height:1.5;word-break:break-all"><a href="${href}" target="_blank" style="color:${C.action};text-decoration:underline">${href}</a></p>`,
  ].join("");
}

export function list(lang: EmailLang, items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr><td width="20" valign="top" style="width:20px;padding:0 0 8px;${text(lang, 17, C.accent)};font-weight:700">&#8226;</td><td valign="top" style="padding:0 0 8px;${text(lang, 17)}">${esc(item)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">${rows}</table>`;
}

export function section(lang: EmailLang, parts: string[]): string {
  return [
    `<div lang="${lang}" style="${text(lang, 17)}">`,
    `<p style="margin:0 0 8px;${text(lang, 13, C.ink2)};font-weight:600;letter-spacing:0.5px">${LANG_NAME[lang]}</p>`,
    ...parts,
    `</div>`,
  ].join("\n");
}

export interface EmailDocument {
  title: string;
  lang: EmailLang;
  sections: string[];
  preheader?: string;
}

export function emailDocument({ title, lang, sections, preheader }: EmailDocument): string {
  const body = sections
    .map((s, i) =>
      i === 0
        ? `<tr><td class="pad" style="padding:32px 40px 8px">${s}</td></tr>`
        : `<tr><td class="pad" style="padding:0 40px"><div style="height:1px;line-height:1px;font-size:0;background:${C.line}">&nbsp;</div></td></tr><tr><td class="pad" style="padding:32px 40px 8px">${s}</td></tr>`,
    )
    .join("\n");
  return [
    `<!doctype html>`,
    `<html lang="${lang}">`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<meta name="color-scheme" content="light">`,
    `<meta name="supported-color-schemes" content="light">`,
    `<title>${esc(title)}</title>`,
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link href="${FONTS_URL}" rel="stylesheet">`,
    `<style>body{margin:0;padding:0}a{color:${C.action}}@media (max-width:620px){.pad{padding-left:24px!important;padding-right:24px!important}.outer{padding:16px 8px!important}}</style>`,
    `</head>`,
    `<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">`,
    preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>` : "",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">`,
    `<tr><td class="outer" align="center" style="padding:32px 16px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-collapse:separate">`,
    `<tr><td bgcolor="${C.bandFrom}" style="background:${C.bandFrom};background-image:linear-gradient(135deg,${C.bandFrom} 0%,#f8dccf 35%,${C.bandTo} 100%);border-radius:16px 16px 0 0;border:1px solid ${C.line};border-bottom:0;padding:24px 40px" class="pad">`,
    `<p style="margin:0;font-family:${FONT.en};font-size:22px;line-height:1.2;font-weight:700;color:${C.action};letter-spacing:-0.2px">#trytpc</p>`,
    `<p lang="th" style="margin:2px 0 0;font-family:${FONT.th};font-size:15px;line-height:1.4;font-weight:500;color:${C.accent}">#ท้ายท่าพระจันทร์</p>`,
    `</td></tr>`,
    `<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-top:0;border-radius:0 0 16px 16px;padding:0 0 24px">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`,
    body,
    `</table>`,
    `</td></tr>`,
    `<tr><td class="pad" align="center" style="padding:24px 40px 0">`,
    `<p lang="th" style="margin:0;font-family:${FONT.th};font-size:13px;line-height:1.6;color:${C.ink3}">อีเมลอัตโนมัติจาก #ท้ายท่าพระจันทร์</p>`,
    `<p lang="en" style="margin:0;font-family:${FONT.en};font-size:13px;line-height:1.6;color:${C.ink3}">An automated email from #trytpc.</p>`,
    `</td></tr>`,
    `</table>`,
    `</td></tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}
