/**
 * Honesty banner (see CONTRIBUTING.md), laid out as the GOV.UK phase banner:
 * a tag, a short statement and a link to /about on one line at 360px, above a
 * bottom rule, no tinted strip. Says plainly that the service is new and still
 * being tested, rather than presenting an alpha or beta product as finished.
 * Renders nothing once `phase` is "live": the whole point of the banner is to
 * stop being true and disappear.
 */

import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import type { ServicePhase } from "@/lib/content/types";
import { ShellContainer } from "./ShellContainer";

export function PhaseBanner({ locale, phase }: { locale: Locale; phase: ServicePhase }) {
  if (phase === "live") return null;

  const tag = phase === "alpha" ? UI.phaseAlpha[locale] : UI.phaseBeta[locale];

  return (
    <aside aria-label={tag} className="border-b border-line">
      <ShellContainer className="flex items-center gap-2 py-1 text-sm">
        <strong className="shrink-0 rounded-pill bg-governance px-2 py-0.5 font-semibold uppercase text-ink-on-fill">{tag}</strong>
        <span className="text-ink-900">
          {UI.phaseNewService[locale]}{" "}
          <Link href={localePath(locale, "/about")} className="inline-flex min-h-[var(--target-min)] items-center">
            {UI.phaseWhatThisMeans[locale]}
          </Link>
        </span>
      </ShellContainer>
    </aside>
  );
}
