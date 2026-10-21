/**
 * Shared renderer for every `opengraph-image.tsx` on the site, so a link
 * shared anywhere unfurls as the page it points at: its section, its title
 * and the service name, in the reader's language.
 *
 * Satori, which backs `ImageResponse`, has no system fonts and cannot read
 * woff2 or variable fonts, so static Lexend (Latin) and Sarabun (Thai and
 * Latin) live in `assets/og/`. Sarabun is listed second as the fallback for
 * any glyph Lexend lacks, which is how a Thai title renders without a
 * per-string script check.
 *
 * Satori also does no Thai mark positioning, so a tone mark over an upper
 * vowel (the mai ek in เรื่อง) lands on the vowel and vanishes, and marks
 * over ป ฝ ฟ hit the ascender. The Sarabun files here have the font's own
 * raised and narrow mark glyphs mapped to private-use code points
 * (U+F700 to U+F710), and `shapeThai` swaps them in before rendering.
 *
 * Colours live in `palette.json` so `scripts/check-contrast.mjs` can hold
 * every text pair to 4.5:1. Share cards are shown scaled down to a third or
 * less, so no text here counts as large. The bright orange is used only in
 * the wordmark, which 1.4.3 exempts as a logotype, and the decorative bar.
 *
 * `next.config.ts` traces `assets/og/**` into every server bundle so the
 * runtime-rendered images for dynamic slugs find the files on Vercel.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { DEFAULT_LOCALE, isLocale, pick, type Locale, type LocaleString } from "@/lib/i18n/config";

import palette from "./palette.json";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export type OgTone = "brand" | "transport" | "welfare" | "activity" | "governance" | "canteen";

const TONE: Record<OgTone, { fill: string; soft: string; ink: string }> = palette.tones;

const SERVICE_NAME: LocaleString = { th: "#ท้ายท่าพระจันทร์", en: "#trytpc" };
const CAMPUS: LocaleString = {
  th: "ธรรมศาสตร์ ท่าพระจันทร์",
  en: "Thammasat Tha Prachan",
};

export interface OgContent {
  locale: Locale;
  title: string;
  kicker?: string;
  description?: string;
  tone?: OgTone;
  /** The home page card: a giant wordmark with `title` as the line beneath it. */
  hero?: boolean;
}

const FONT_DIR = join(process.cwd(), "assets/og");

const FONT_FILES = [
  { name: "Lexend", file: "lexend-latin-400-normal.woff", weight: 400 },
  { name: "Lexend", file: "lexend-latin-700-normal.woff", weight: 700 },
  { name: "Sarabun", file: "Sarabun-Regular.ttf", weight: 400 },
  { name: "Sarabun", file: "Sarabun-Bold.ttf", weight: 700 },
] as const;

let fonts: ReturnType<typeof readFonts> | undefined;
let logo: Promise<string> | undefined;

function loadLogo() {
  logo ??= readFile(join(FONT_DIR, "logo.png")).then((data) => `data:image/png;base64,${data.toString("base64")}`);
  return logo;
}

function Logo({ src, size }: { src: string; size: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="" />;
}

function readFonts() {
  return Promise.all(
    FONT_FILES.map(async ({ name, file, weight }) => ({
      name,
      weight,
      style: "normal" as const,
      data: await readFile(join(FONT_DIR, file)),
    })),
  );
}

function loadFonts() {
  fonts ??= readFonts();
  return fonts;
}

const UPPER_VOWELS = "\u0E31\u0E34\u0E35\u0E36\u0E37\u0E47\u0E4D";
const TALL_CONSONANTS = "\u0E1B\u0E1D\u0E1F";
const HIGH_TONE = 0xf700;
const NARROW_TONE = 0xf705;
const NARROW_UPPER = 0xf70a;

function shapeThai(text: string): string {
  let out = "";
  let base = "";
  let upper = false;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const tall = TALL_CONSONANTS.includes(base);
    if (cp >= 0x0e48 && cp <= 0x0e4c) {
      out += String.fromCodePoint((upper ? HIGH_TONE : tall ? NARROW_TONE : cp) + (upper || tall ? cp - 0x0e48 : 0));
    } else if (UPPER_VOWELS.includes(ch)) {
      out += tall ? String.fromCodePoint(NARROW_UPPER + UPPER_VOWELS.indexOf(ch)) : ch;
      upper = true;
    } else {
      if (!(cp >= 0x0e38 && cp <= 0x0e3a)) {
        base = ch;
        upper = false;
      }
      out += ch;
    }
  }
  return out;
}

function clip(text: string, max: number): string {
  const chars = Array.from(text.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : chars.join("");
}

function titleSize(title: string): number {
  const n = Array.from(title).length;
  if (n <= 24) return 84;
  if (n <= 48) return 68;
  if (n <= 80) return 56;
  return 46;
}

/** Narrows a raw `[locale]` param, falling back to Thai like the layout does. */
export function ogLocale(raw: string | undefined): Locale {
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/** Alt text that says what the image shows, for `generateImageMetadata`. */
export function ogAlt({ locale, title, kicker, description, hero }: OgContent): string {
  if (hero) return `${pick(SERVICE_NAME, locale)} · ${title}`;
  return [kicker, title, description, pick(SERVICE_NAME, locale)].filter(Boolean).join(" · ");
}

function Wordmark({ locale, size }: { locale: Locale; size: number }) {
  const name = pick(SERVICE_NAME, locale);
  const lead = locale === "th" ? "#ท้าย" : "#try";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1,
        fontFamily: locale === "th" ? "Sarabun" : "Lexend",
        color: palette.purple,
      }}
    >
      <span style={{ color: palette.orange }}>{shapeThai(lead)}</span>
      <span>{shapeThai(name.slice(lead.length))}</span>
    </div>
  );
}

async function frame(soft: string, children: React.ReactNode[]): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ffffff",
          fontFamily: "Lexend, Sarabun",
          color: palette.ink,
        }}
      >
        <div style={{ width: 28, height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", background: palette.purple }} />
          <div style={{ flex: 1, display: "flex", background: palette.orange }} />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px 56px 64px",
            background: soft,
          }}
        >
          {...children}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}

async function renderOgHero({ locale, title }: OgContent): Promise<ImageResponse> {
  const logoSrc = await loadLogo();
  return frame(
    TONE.brand.soft,
    [
      <div key="main" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Wordmark locale={locale} size={locale === "th" ? 124 : 216} />
        <div
          style={{
            display: "flex",
            fontSize: 40,
            lineHeight: locale === "th" ? 1.6 : 1.35,
            color: palette.inkMuted,
            marginTop: 40,
            maxWidth: 960,
          }}
        >
          {shapeThai(clip(title, 120))}
        </div>
      </div>,
      <div key="campus" style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: palette.inkMuted }}>
        <Logo src={logoSrc} size={72} />
        {shapeThai(pick(CAMPUS, locale))}
      </div>,
    ],
  );
}

export async function renderOgImage(content: OgContent): Promise<ImageResponse> {
  if (content.hero) return renderOgHero(content);
  const logoSrc = await loadLogo();
  const { locale, title, kicker, description, tone = "brand" } = content;
  const { fill, soft, ink } = TONE[tone];
  const heading = shapeThai(clip(title, 110));
  const lede = description ? shapeThai(clip(description, 160)) : undefined;

  return frame(
    soft,
    [
      <div key="main" style={{ display: "flex", flexDirection: "column" }}>
        {kicker ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              fontSize: 30,
              fontWeight: 700,
              padding: "8px 20px",
              borderRadius: 8,
              background: fill,
              color: ink,
              marginBottom: 32,
            }}
          >
            {shapeThai(clip(kicker, 48))}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontSize: titleSize(heading),
            fontWeight: 700,
            lineHeight: locale === "th" ? 1.45 : 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {heading}
        </div>
        {lede ? (
          <div style={{ display: "flex", fontSize: 32, lineHeight: locale === "th" ? 1.6 : 1.4, color: palette.inkMuted, marginTop: 24 }}>{lede}</div>
        ) : null}
      </div>,
      <div
        key="footer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `3px solid ${palette.rule}`,
          paddingTop: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo src={logoSrc} size={56} />
          <Wordmark locale={locale} size={40} />
        </div>
        <div style={{ display: "flex", fontSize: 28, color: palette.inkMuted }}>{shapeThai(pick(CAMPUS, locale))}</div>
      </div>,
    ],
  );
}
