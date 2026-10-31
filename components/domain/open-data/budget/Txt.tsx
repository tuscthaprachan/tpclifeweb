import { needsThaiLang } from "./labels";
import type { Locale } from "@/lib/i18n/config";

/** Text from the source, marked as Thai inside an English page. */
export function Txt({ text, locale }: { text: string; locale: Locale }) {
  return needsThaiLang(text, locale) ? <span lang="th">{text}</span> : <>{text}</>;
}
