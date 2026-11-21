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
 * The Thai home card sets its wordmark in JS Chanok, the face the Thai home
 * hero uses. It has no OpenType mark positioning either, but carries the
 * Windows private-use alternates (lowered, left-shifted and descender-less
 * forms), which `shapeChanok` swaps in. The home cards also show the top half
 * of the hero dome, pre-rendered to `dome-top.png` because Satori cannot
 * resolve the illustration's `<use>` references.
 *
 * `next.config.ts` traces `assets/og/**` into every server bundle so the
 * runtime-rendered images for dynamic slugs find the files on Vercel.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getSiteSettings } from "@/components/layout/site-settings";
import { DEFAULT_LOCALE, isLocale, pick, type Locale, type LocaleString } from "@/lib/i18n/config";

import palette from "./palette.json";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export type OgTone = "brand" | "transport" | "welfare" | "activity" | "governance" | "canteen";

const TONE: Record<OgTone, { fill: string; soft: string; ink: string }> = palette.tones;

const WORDMARK_LEAD: LocaleString = { th: "#ท้าย", en: "#try" };

async function serviceName(locale: Locale): Promise<string> {
  return pick((await getSiteSettings()).serviceName, locale);
}
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
  { name: "JS Chanok", file: "JSChanok-Normal.ttf", weight: 400 },
] as const;

let fonts: ReturnType<typeof readFonts> | undefined;
let dome: Promise<string> | undefined;

function loadDome() {
  dome ??= readFile(join(FONT_DIR, "dome-top.png")).then((data) => `data:image/png;base64,${data.toString("base64")}`);
  return dome;
}

const DOME_RATIO = 607 / 920;

function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path d="M4 60 32 20 60 60Z" fill={palette.logoOrange} />
      <path d="M32 4 44 30H20Z" fill={palette.purple} />
    </svg>
  );
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

const CHANOK_ASCENDERS = "\u0E1B\u0E1D\u0E1F\u0E2C";
const CHANOK_UPPER = "\u0E31\u0E34\u0E35\u0E36\u0E37\u0E47\u0E4D";
const CHANOK_UPPER_LEFT = [0xf710, 0xf701, 0xf702, 0xf703, 0xf704, 0xf712, 0xf711];
const CHANOK_LOWER = "\u0E38\u0E39\u0E3A";

function shapeChanok(text: string): string {
  let out = "";
  let base = "";
  let upper = false;
  for (const ch of text.replace(/\u0E33/g, "\u0E4D\u0E32").replace(/([\u0E48-\u0E4B])\u0E4D/g, "\u0E4D$1")) {
    const cp = ch.codePointAt(0)!;
    const tall = CHANOK_ASCENDERS.includes(base);
    if (cp >= 0x0e48 && cp <= 0x0e4c) {
      const i = cp - 0x0e48;
      out += String.fromCodePoint(upper ? (tall ? 0xf713 + i : cp) : tall ? 0xf705 + i : 0xf70a + i);
    } else if (CHANOK_UPPER.includes(ch)) {
      out += tall ? String.fromCodePoint(CHANOK_UPPER_LEFT[CHANOK_UPPER.indexOf(ch)]!) : ch;
      upper = true;
    } else if (CHANOK_LOWER.includes(ch)) {
      out += ch;
    } else {
      base = ch;
      upper = false;
      out += ch;
    }
  }
  return out;
}

function clip(text: string, max: number): string {
  const chars = Array.from(text.trim());
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : chars.join("");
}

const THAI = /[฀-๿]/;
const thaiWords = new Intl.Segmenter("th", { granularity: "word" });

/**
 * Satori breaks lines only at spaces, and Thai puts no spaces between words,
 * so a Thai sentence is one unbreakable run that overflows its box. Split it
 * into words (spaces stay on the word before them) and lay them out as
 * wrapping flex items, so a line can break between any two words. The
 * container needs `flexWrap: "wrap"`. Text without Thai is returned as is.
 */
function wrapWords(text: string, shape: (s: string) => string = shapeThai): React.ReactNode {
  if (!THAI.test(text)) return shape(text);
  const words: string[] = [];
  for (const { segment } of thaiWords.segment(text)) {
    if (/^\s+$/.test(segment) && words.length > 0) words[words.length - 1] += segment;
    else words.push(segment);
  }
  return words.map((word, i) => (
    <span key={i} style={{ whiteSpace: "pre" }}>
      {shape(word)}
    </span>
  ));
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
export async function ogAlt({ locale, title, kicker, description, hero }: OgContent): Promise<string> {
  const name = await serviceName(locale);
  if (hero) return `${name} · ${title}`;
  return [kicker, title, description, name].filter(Boolean).join(" · ");
}

function Wordmark({ locale, name, size, display = false }: { locale: Locale; name: string; size: number; display?: boolean }) {
  const builtIn = pick(WORDMARK_LEAD, locale);
  const lead = name.startsWith(builtIn) ? builtIn : name.startsWith("#") ? "#" : "";
  const chanok = display && locale === "th";
  const shape = chanok ? shapeChanok : shapeThai;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        fontSize: size,
        fontWeight: chanok ? 400 : 700,
        lineHeight: chanok ? 1.3 : 1,
        fontFamily: chanok ? "JS Chanok" : locale === "th" ? "Sarabun" : "Lexend",
        color: palette.purple,
      }}
    >
      <span style={{ color: palette.orange }}>{shape(lead)}</span>
      <span>{shape(name.slice(lead.length))}</span>
    </div>
  );
}

async function frame(soft: string, children: React.ReactNode[], decoration?: React.ReactNode): Promise<ImageResponse> {
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
            position: "relative",
          }}
        >
          {decoration}
          {...children}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}

const DOME_HEIGHT = 560;

async function renderOgHero({ locale, title }: OgContent): Promise<ImageResponse> {
  const domeSrc = await loadDome();
  const name = await serviceName(locale);
  return frame(
    TONE.brand.soft,
    [
      <div key="main" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Wordmark locale={locale} name={name} size={locale === "th" ? 150 : 168} display />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 36,
            lineHeight: locale === "th" ? 1.6 : 1.35,
            color: palette.inkMuted,
            marginTop: 40,
            maxWidth: 660,
          }}
        >
          {wrapWords(clip(title, 120))}
        </div>
      </div>,
      <div key="campus" style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: palette.inkMuted }}>
        <Logo size={64} />
        {shapeThai(pick(CAMPUS, locale))}
      </div>,
    ],
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key="dome"
      src={domeSrc}
      width={Math.round(DOME_HEIGHT * DOME_RATIO)}
      height={DOME_HEIGHT}
      alt=""
      style={{ position: "absolute", right: 72, bottom: 0 }}
    />,
  );
}

export async function renderOgImage(content: OgContent): Promise<ImageResponse> {
  if (content.hero) return renderOgHero(content);
  const name = await serviceName(content.locale);
  const { locale, title, kicker, description, tone = "brand" } = content;
  const { fill, soft, ink } = TONE[tone];
  const heading = clip(title, 110);
  const lede = description ? clip(description, 160) : undefined;

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
            flexWrap: "wrap",
            fontSize: titleSize(heading),
            fontWeight: 700,
            lineHeight: locale === "th" ? 1.45 : 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {wrapWords(heading)}
        </div>
        {lede ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 32,
              lineHeight: locale === "th" ? 1.6 : 1.4,
              color: palette.inkMuted,
              marginTop: 24,
            }}
          >
            {wrapWords(lede)}
          </div>
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
          <Logo size={56} />
          <Wordmark locale={locale} name={name} size={40} />
        </div>
        <div style={{ display: "flex", fontSize: 28, color: palette.inkMuted }}>{shapeThai(pick(CAMPUS, locale))}</div>
      </div>,
    ],
  );
}
