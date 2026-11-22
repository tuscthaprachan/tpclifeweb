/**
 * Honesty banner (see CONTRIBUTING.md), laid out as the GOV.UK phase banner:
 * a tag, a short statement and a link to /about on one line at 360px, above a
 * bottom rule, no tinted strip. Says plainly that the service is new and still
 * being tested, rather than presenting an alpha or beta product as finished.
 * Renders nothing once `phase` is "live": the whole point of the banner is to
 * stop being true and disappear.
 */

import Link from "next/link";
import { localePath, pick, type Locale, type LocaleString } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { ServicePhase } from "@/lib/content/types";
import { ShellContainer } from "./ShellContainer";

export function PhaseBanner({ locale, phase, note }: { locale: Locale; phase: ServicePhase; note?: LocaleString }) {
  if (phase === "live") return null;

  const tag = phase === "alpha" ? UI.phaseAlpha[locale] : UI.phaseBeta[locale];
  const custom = pick(note, locale).trim();
  const message = locale === "en" && custom && !/[.!?]$/.test(custom) ? `${custom}.` : custom;

  return (
    <aside aria-label={tag} className="border-b border-line">
      <ShellContainer className="flex items-center gap-2 py-1 text-sm">
        <strong className="shrink-0 rounded-pill bg-governance px-2 py-0.5 font-semibold uppercase text-ink-on-fill">{tag}</strong>
        <span className="min-w-0 text-ink-900 sm:hidden">
          <Link href={localePath(locale, "/about")} className="inline-flex min-h-[var(--target-min)] items-center">
            {UI.hlPhaseShort[locale]}
          </Link>
        </span>
        <span className="hidden text-ink-900 sm:inline">
          {message ? `${message} ` : null}
          <Link href={localePath(locale, "/about")} className="inline-flex min-h-[var(--target-min)] items-center">
            {UI.phaseWhatThisMeans[locale]}
          </Link>
        </span>
      </ShellContainer>
    </aside>
  );
}
