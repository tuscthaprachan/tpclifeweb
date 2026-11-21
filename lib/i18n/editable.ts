/**
 * Site text that staff can change in the console (Website > Site text).
 *
 * A dictionary of bilingual strings is wrapped once with `editableStrings`:
 *
 *   export const UI = editableStrings("ui", { home: { th: "หน้าแรก", en: "Home" } });
 *
 * Code keeps reading `UI.home[locale]` exactly as before. Each read goes
 * through a getter that returns the console's wording when there is one and
 * the built-in text otherwise, so every page, component, metadata function,
 * share image and email picks up an edit without changing how it reads text.
 *
 * The overrides are the same for every visitor, so one process-wide store
 * holds them. On the server, the root layouts load the published overrides
 * (`ensureSiteText`, lib/content/site-text.ts) before anything below them
 * renders. In the browser, the root layout writes the same overrides into the
 * page before the app's scripts run, so client components hydrate with the
 * text the server rendered.
 *
 * Isomorphic: no server-only imports.
 */

import type { LocaleString } from "./config";

/** One override per language; a language left out falls back to the built-in text. */
export type TextOverride = { th?: string; en?: string };
/** Overrides by full key: `<namespace>.<key>`. */
export type TextOverrides = Record<string, TextOverride>;

export interface EditableDictionary {
  namespace: string;
  /** Console heading for this group of text. */
  label: LocaleString;
  /** The built-in text, untouched by overrides. */
  defaults: Readonly<Record<string, LocaleString>>;
}

const STORE_KEY = "__TRYTPC_SITE_TEXT__";
const REGISTRY_KEY = "__TRYTPC_SITE_TEXT_REGISTRY__";

type Store = { overrides: TextOverrides };

function store(): Store {
  const g = globalThis as unknown as Record<string, Store | undefined>;
  let s = g[STORE_KEY];
  if (!s) {
    s = { overrides: {} };
    g[STORE_KEY] = s;
  }
  return s;
}

function registry(): Map<string, EditableDictionary> {
  const g = globalThis as unknown as Record<string, Map<string, EditableDictionary> | undefined>;
  let r = g[REGISTRY_KEY];
  if (!r) {
    r = new Map();
    g[REGISTRY_KEY] = r;
  }
  return r;
}

/** Replaces every override at once. Called with the published set. */
export function setTextOverrides(overrides: TextOverrides): void {
  store().overrides = overrides ?? {};
}

/** The overrides currently applied in this process. */
export function getTextOverrides(): TextOverrides {
  return store().overrides;
}

/** Every dictionary wrapped so far, in the order its module loaded. */
export function editableDictionaries(): EditableDictionary[] {
  return [...registry().values()];
}

/** The full stored key for one string. */
export const textKey = (namespace: string, key: string) => `${namespace}.${key}`;

/** The placeholders, such as {name}, a text uses, sorted and without repeats. */
export function textPlaceholders(value: string): string[] {
  return [...new Set(value.match(/\{[a-zA-Z0-9_]+\}/g) ?? [])].sort();
}

/**
 * Wraps a dictionary of bilingual strings so each value reads through the
 * console's overrides. `namespace` must be unique and stable: it is part of
 * every stored key. `label` names the group in the console.
 */
export function editableStrings<T extends Record<string, LocaleString>>(
  namespace: string,
  raw: T,
  label?: LocaleString,
): { readonly [K in keyof T]: LocaleString } {
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(namespace)) throw new Error(`editableStrings: bad namespace "${namespace}"`);
  const defaults: Record<string, LocaleString> = {};
  const out: Record<string, LocaleString> = {};
  for (const [key, value] of Object.entries(raw)) {
    const fallback: LocaleString = { th: value.th, en: value.en };
    defaults[key] = fallback;
    const full = textKey(namespace, key);
    const entry = {} as LocaleString;
    for (const lang of ["th", "en"] as const) {
      Object.defineProperty(entry, lang, {
        enumerable: true,
        get() {
          return store().overrides[full]?.[lang] || fallback[lang];
        },
      });
    }
    out[key] = entry;
  }
  // Hot reload re-runs the module with the same namespace; the newest copy wins.
  registry().set(namespace, { namespace, label: label ?? { th: namespace, en: namespace }, defaults });
  return out as { readonly [K in keyof T]: LocaleString };
}

/** The browser script that sets the overrides before the app's scripts run. */
export function siteTextBootScript(overrides: TextOverrides): string {
  const json = JSON.stringify({ overrides }).replace(/</g, "\\u003c");
  return `window[${JSON.stringify(STORE_KEY)}]=${json};`;
}

/** Fills placeholders such as {name} in a text. Unknown placeholders stay as they are. */
export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}
