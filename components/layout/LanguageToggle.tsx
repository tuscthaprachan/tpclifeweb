/**
 * The language toggle is binary (see `OTHER_LOCALE` in lib/i18n/config), so
 * this renders a single link to the other language rather than a two-item
 * list. The visible text is the OTHER language's own name for itself
 * (LOCALE_LABEL), never a translation, so a reader who cannot read the
 * current language still recognises their own at a glance, and `lang` /
 * `hrefLang` mark it correctly for assistive tech either way (3.1.2).
 *
 * The href alone is what makes this work with JavaScript disabled: it is a
 * real link to the same page under the other locale prefix, built with
 * `stripLocale`. The `onClick` only adds a nicety, remembering the choice in
 * `LOCALE_COOKIE` for the next bare-path visit; it is not required for the
 * link to function.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_LABEL,
  OTHER_LOCALE,
  localePath,
  stripLocale,
  type Locale,
} from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export function LanguageToggle({ locale, className = "" }: { locale: Locale; className?: string }) {
  const pathname = usePathname();
  const { path } = stripLocale(pathname);
  const target = OTHER_LOCALE[locale];
  const href = localePath(target, path);

  return (
    <Link
      href={href}
      lang={target}
      hrefLang={target}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
      }}
      className={`inline-flex min-h-[var(--target-min)] items-center rounded-control border border-line-strong px-3 py-1 text-sm font-medium text-ink-900 no-underline hover:text-action ${className}`.trim()}
    >
      {LOCALE_LABEL[target]}
      {/* Context for assistive tech, appended rather than replacing the
          visible label (2.5.3 Label in Name). Same pattern as
          externalLinkSuffix in lib/a11y. */}
      <span className="visually-hidden"> ({UI.changeLanguage[locale]})</span>
    </Link>
  );
}
