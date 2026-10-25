/**
 * Root fallback for any URL that does not match a route file anywhere in the
 * app, which per Next.js routing rules is the ONLY case that reaches this
 * file: a mistyped or dead link (e.g. `/th/forms` before that route exists),
 * a path the proxy does not touch (dotted paths, `/api`), or the
 * `notFound()` call in `app/[locale]/layout.tsx` for an invalid `locale`
 * value, which bubbles up to here since that layout has no parent to catch
 * it. Content missing WITHIN a real route (a form or news slug that is not
 * in the CMS) is a different case, handled by `app/[locale]/not-found.tsx`
 * instead, inside the normal header/footer chrome.
 *
 * Because there is no `app/layout.tsx`, Next.js has no root layout to hang
 * this off, so it supplies its own minimal default (`<html><body>{children}
 * </body></html>`, no `lang`) and renders this file inside it. This file
 * therefore also declares its own `<html>`/`<body>` with the fonts and a
 * `lang`, which browsers merge onto Next's outer pair per the HTML parsing
 * spec (a redundant `<html>`/`<body>` start tag adds its attributes to the
 * already-open element rather than nesting) - confirmed against the rendered
 * DOM, not just the HTML source, while building this. The alternative,
 * adding a real `app/layout.tsx`, was rejected: Next would then treat IT as
 * the sole root layout for every route, forcing `[locale]/layout.tsx` to
 * stop rendering `<html>`, which is what makes the per-locale `lang`
 * attribute correct in the first place.
 *
 * The reader's language is unknown at this point, so both languages are
 * shown rather than guessing: Thai first as the site default, English
 * clearly marked with its own `lang` attribute (3.1.2).
 */

import Link from "next/link";
import "@/styles/globals.css";
import { River } from "@/components/illustrations/River";
import { fontVariables } from "@/components/layout/fonts";
import { HTML_LANG } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export default function GlobalNotFound() {
  return (
    <html lang={HTML_LANG.th} className={fontVariables}>
      <body>
        <main id="main-content" className="mx-auto max-w-[var(--width-content)] px-[var(--gutter)] py-12">
          <River className="mb-4 h-[84px] w-[120px]" />
          <h1>{UI.pageNotFoundTitle.th}</h1>
          <p className="mt-4 text-ink-600">{UI.pageNotFoundBody.th}</p>
          <ul className="mt-6 flex flex-col gap-2">
            <li>
              <Link href="/th" className="text-action">
                {UI.home.th}
              </Link>
            </li>
            <li>
              <Link href="/en" lang="en" className="text-action">
                {UI.home.en} (English)
              </Link>
            </li>
          </ul>

          <hr className="my-8" />

          <section lang="en">
            <h2>{UI.pageNotFoundTitle.en}</h2>
            <p className="mt-4 text-ink-600">{UI.pageNotFoundBody.en}</p>
            <p className="mt-6">
              <Link href="/en" className="text-action">
                {UI.home.en}
              </Link>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
