/**
 * 2.4.1 Bypass Blocks. Must be the first focusable element in the document,
 * so it is rendered immediately inside `<body>` in the root layout, before
 * the header. Hidden until it receives focus, using the helper class from
 * globals.css rather than a bespoke one, so its behaviour matches every other
 * visually-hidden-until-focused element on the site.
 */

import type { Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";

export function SkipLink({ locale }: { locale: Locale }) {
  return (
    <a
      href="#main-content"
      className="visually-hidden-focusable fixed left-2 top-2 z-[var(--z-skiplink)] rounded-control bg-surface px-4 py-2 text-ink-900 outline-none"
    >
      {UI.skipToContent[locale]}
    </a>
  );
}
