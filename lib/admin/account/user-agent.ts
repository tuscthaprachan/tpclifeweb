/**
 * A short device description from a User-Agent header, for the session list.
 * Deliberately small: it names the common browsers and systems and otherwise
 * says nothing, since the header is not a reliable identifier.
 */

export interface DeviceInfo {
  browser: string | null;
  os: string | null;
}

const BROWSERS: [RegExp, string][] = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/(?:Chrome|CriOS)\//, "Chrome"],
  [/(?:Firefox|FxiOS)\//, "Firefox"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent ?? "";
  return {
    browser: BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null,
    os: SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] ?? null,
  };
}
