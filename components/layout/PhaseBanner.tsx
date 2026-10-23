/**
 * Honesty banner (see CONTRIBUTING.md). Says plainly that the service is new
 * and still being tested, rather than presenting an alpha or beta product as
 * finished. Renders nothing once `phase` is "live": the whole point of the
 * banner is to stop being true and disappear.
 */

import { pick, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { LocaleString, ServicePhase } from "@/lib/content/types";
import { ShellContainer } from "./ShellContainer";

export function PhaseBanner({
  locale,
  phase,
  phaseNote,
}: {
  locale: Locale;
  phase: ServicePhase;
  phaseNote?: LocaleString;
}) {
  if (phase === "live") return null;

  const tag = phase === "alpha" ? UI.phaseAlpha[locale] : UI.phaseBeta[locale];
  const defaultNote = phase === "alpha" ? UI.phaseAlphaNote[locale] : UI.phaseBetaNote[locale];
  const note = phaseNote ? pick(phaseNote, locale) : defaultNote;

  return (
    <div className="border-b border-line bg-governance-soft">
      <ShellContainer className="flex flex-wrap items-center gap-3 py-2 text-sm">
        <span className="rounded-pill bg-governance px-2 py-0.5 font-semibold text-ink-on-fill">{tag}</span>
        <span className="text-ink-900">{note}</span>
      </ShellContainer>
    </div>
  );
}
