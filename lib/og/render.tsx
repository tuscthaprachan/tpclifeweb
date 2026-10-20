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
 * `next.config.ts` traces `assets/og/**` into every server bundle so the
 * runtime-rendered images for dynamic slugs find the files on Vercel.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { DEFAULT_LOCALE, isLocale, pick, type Locale, type LocaleString } from "@/lib/i18n/config";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export type OgTone = "brand" | "transport" | "welfare" | "activity" | "governance" | "canteen";

const TONE: Record<OgTone, { fill: string; soft: string; ink?: string }> = {
  brand: { fill: "#613f87", soft: "#f1eff5", ink: "#ffffff" },
  transport: { fill: "#e7935b", soft: "#fbe4d7" },
  welfare: { fill: "#e07e61", soft: "#fbdfd7" },
  activity: { fill: "#c293e5", soft: "#f0e4f9" },
  governance: { fill: "#998fe8", soft: "#e4e3fb" },
  canteen: { fill: "#e7935b", soft: "#fef8f4" },
};

const SERVICE_NAME: LocaleString = { th: "#ท้ายท่าพระจันทร์", en: "#tpclife" };
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
}

const FONT_DIR = join(process.cwd(), "assets/og");

const FONT_FILES = [
  { name: "Lexend", file: "lexend-latin-400-normal.woff", weight: 400 },
  { name: "Lexend", file: "lexend-latin-700-normal.woff", weight: 700 },
  { name: "Sarabun", file: "Sarabun-Regular.ttf", weight: 400 },
  { name: "Sarabun", file: "Sarabun-Bold.ttf", weight: 700 },
] as const;

let fonts: ReturnType<typeof readFonts> | undefined;

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
export function ogAlt({ locale, title, kicker }: Pick<OgContent, "locale" | "title" | "kicker">): string {
  return [kicker, title, pick(SERVICE_NAME, locale)].filter(Boolean).join(" · ");
}

export async function renderOgImage({ locale, title, kicker, description, tone = "brand" }: OgContent): Promise<ImageResponse> {
  const { fill, soft, ink = "#1f1a1c" } = TONE[tone];
  const heading = clip(title, 110);
  const lede = description ? clip(description, 160) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ffffff",
          fontFamily: "Lexend, Sarabun",
          color: "#1f1a1c",
        }}
      >
        <div style={{ width: 28, height: "100%", display: "flex", background: fill }} />
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
          <div style={{ display: "flex", flexDirection: "column" }}>
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
                {clip(kicker, 48)}
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                fontSize: titleSize(heading),
                fontWeight: 700,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              {heading}
            </div>
            {lede ? (
              <div style={{ display: "flex", fontSize: 32, lineHeight: 1.4, color: "#554f51", marginTop: 24 }}>{lede}</div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "3px solid #e2dcde",
              paddingTop: 28,
            }}
          >
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#613f87" }}>{pick(SERVICE_NAME, locale)}</div>
            <div style={{ display: "flex", fontSize: 28, color: "#554f51" }}>{pick(CAMPUS, locale)}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
