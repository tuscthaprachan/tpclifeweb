import "server-only";

import type { LocaleString } from "@/lib/i18n/config";
import { textKey } from "@/lib/i18n/editable";
import { editableDictionaries } from "@/lib/i18n/site-text-registry";

/** Every editable string's built-in text, by full key. */
export function siteTextDefaults(): Map<string, LocaleString> {
  const out = new Map<string, LocaleString>();
  for (const dict of editableDictionaries()) {
    for (const [key, value] of Object.entries(dict.defaults)) out.set(textKey(dict.namespace, key), value);
  }
  return out;
}
