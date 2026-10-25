/**
 * Not-found content for missing CONTENT, not missing ROUTES. This only
 * renders when something inside a matched `[locale]` page or layout
 * explicitly calls `notFound()`, for example a form or news slug that does
 * not exist in the CMS. A URL that never matches any route file at all
 * (a typo, an old bookmark) never reaches this file and goes straight to the
 * root `app/not-found.tsx` instead, per Next.js routing rules, so this is
 * always rendered inside the real `[locale]/layout.tsx`: header, footer and
 * `<html lang>` are already correct here, and this only fills `<main>`.
 *
 * Next.js does not pass route params to `not-found.tsx` files, so the locale
 * is read with `useParams`, which still works because it comes from the
 * router's segment context rather than from props.
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/lib/i18n/config";
import { River } from "@/components/illustrations/River";
import { UI } from "@/lib/i18n/strings";

export default function LocaleNotFound() {
  const params = useParams<{ locale: string }>();
  const locale: Locale = isLocale(params.locale) ? params.locale : DEFAULT_LOCALE;

  return (
    <div className="py-12">
      <River className="mb-4 h-[84px] w-[120px]" />
      <h1>{UI.pageNotFoundTitle[locale]}</h1>
      <p className="mt-4 text-ink-600">{UI.pageNotFoundBody[locale]}</p>
      <ul className="mt-6 flex flex-col gap-2">
        <li>
          <Link href={localePath(locale, "/")} className="text-action">
            {UI.home[locale]}
          </Link>
        </li>
        <li>
          <Link href={localePath(locale, "/search")} className="text-action">
            {UI.search[locale]}
          </Link>
        </li>
      </ul>
    </div>
  );
}
