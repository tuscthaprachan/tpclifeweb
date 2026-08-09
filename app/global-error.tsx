/**
 * Root error boundary. Next.js only ever renders this when the ROOT layout
 * itself throws (`app/[locale]/layout.tsx`, which supplies `<html>`,
 * `<body>`, the header and the footer). In every other case an error is
 * caught by `app/[locale]/error.tsx` instead, deeper in the tree, with the
 * real header/footer/help block still standing around it.
 *
 * Because the layout that failed is the one that would normally provide
 * `<html>`/`<body>`, this file must supply its own, the same reasoning
 * `app/not-found.tsx` documents for the equivalent 404 case. For the same
 * reason this file deliberately does not import `getSiteSettings` or any
 * other module that could itself throw: the whole point of this boundary is
 * to still render when something upstream is broken, so it carries its own
 * fixed, hardcoded copy of the two help channels rather than depending on
 * anything that might fail alongside whatever tripped this boundary. The
 * reader's language is unknown at this point (the locale layout is exactly
 * what failed), so both languages are shown, the same approach
 * `app/not-found.tsx` takes.
 */

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { fontVariables } from "@/components/layout/fonts";
import "@/styles/globals.css";
import { HTML_LANG } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

const HELP_CONTACTS = [
  { label: "TUSU Tha Prachan / อมธ. ท่าพระจันทร์", href: "https://linktr.ee/TUSU_Tha.pra.chaN" },
  { label: "TUSC Tha Prachan / สภานักศึกษา ท่าพระจันทร์", href: "https://linktr.ee/tusc.tpc" },
];

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang={HTML_LANG.th} className={fontVariables}>
      <body>
        <main id="main-content" className="mx-auto max-w-[var(--width-content)] px-[var(--gutter)] py-12">
          <h1>{UI.errorTitle.th}</h1>
          <p className="mt-4 text-ink-600">{UI.errorBody.th}</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button type="button" onClick={reset} className="text-action underline">
              {UI.tryAgain.th}
            </button>
            <Link href="/th" className="text-action underline">
              {UI.home.th}
            </Link>
            <Link href="/th/search" className="text-action underline">
              {UI.search.th}
            </Link>
          </div>

          <hr className="my-8" />

          <section lang="en">
            <h2>{UI.errorTitle.en}</h2>
            <p className="mt-4 text-ink-600">{UI.errorBody.en}</p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button type="button" onClick={reset} className="text-action underline">
                {UI.tryAgain.en}
              </button>
              <Link href="/en" className="text-action underline">
                {UI.home.en}
              </Link>
              <Link href="/en/search" className="text-action underline">
                {UI.search.en}
              </Link>
            </div>
          </section>

          <hr className="my-8" />

          {/* 3.2.6 Consistent Help. The footer that normally carries this is
              part of the layout that just failed, so it is repeated here by
              hand rather than left out. */}
          <section aria-labelledby="global-error-help-heading">
            <h2 id="global-error-help-heading">
              {UI.needHelp.th} / {UI.needHelp.en}
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {HELP_CONTACTS.map((contact) => (
                <li key={contact.href}>
                  <a href={contact.href} target="_blank" rel="noopener noreferrer" className="text-action underline">
                    {contact.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </body>
    </html>
  );
}
