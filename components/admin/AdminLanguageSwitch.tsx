"use client";

/**
 * The console's language switch. A real form posting to a Server Action, so it
 * works with JavaScript off; the only client code is reading the current path
 * to return to. Shows the other language in its own name, like the site's
 * toggle (LOCALE_LABEL).
 */

import { usePathname } from "next/navigation";
import { LOCALE_LABEL, OTHER_LOCALE, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { setAdminLocale } from "@/app/admin/actions";

export function AdminLanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const target = OTHER_LOCALE[locale];
  return (
    <form action={setAdminLocale}>
      <input type="hidden" name="locale" value={target} />
      <input type="hidden" name="returnTo" value={pathname} />
      <button
        type="submit"
        lang={target}
        className="inline-flex h-9 min-h-[var(--target-min)] items-center rounded-control border border-line-strong px-3 text-sm font-medium leading-none text-ink-900 hover:text-action"
      >
        {LOCALE_LABEL[target]}
        <span className="visually-hidden"> ({UI.changeLanguage[locale]})</span>
      </button>
    </form>
  );
}
