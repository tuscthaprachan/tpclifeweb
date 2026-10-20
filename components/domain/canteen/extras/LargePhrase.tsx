import type { Locale } from "@/lib/i18n/config";

import { EXTRAS } from "./strings";

export interface PhraseView {
  th: string;
  romanised: string;
  en: string;
}

/**
 * One phrase, big. The Thai fills the width in the largest comfortable size;
 * the romanisation and meaning sit small underneath for the person holding
 * the phone. Used by the dialog and by the no-JavaScript `?show=` page, so
 * both look the same. Plain markup, safe on the server and the client.
 */
export function LargePhrase({ phrase, locale }: { phrase: PhraseView; locale: Locale }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-[var(--space-6)] text-center">
      <p lang="th" className="m-0 max-w-full text-[clamp(2.75rem,15vw,7rem)] font-semibold leading-tight text-ink-900 [overflow-wrap:anywhere]">
        {phrase.th}
      </p>
      <div className="flex flex-col gap-[var(--space-1)]">
        <p lang="th-Latn" className="m-0 text-lg text-ink-900">
          {phrase.romanised}
        </p>
        <p lang="en" className="m-0 text-ink-600">
          {phrase.en}
        </p>
        <p className="m-0 mt-[var(--space-2)] text-sm text-ink-600">{EXTRAS.showHint[locale]}</p>
      </div>
    </div>
  );
}
