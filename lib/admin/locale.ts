import "server-only";

/**
 * Which language the staff console speaks.
 *
 * The console lives at /admin, outside `/[locale]`, so there is no prefix to
 * read. It uses the same remembered-choice cookie as the public site
 * (`LOCALE_COOKIE`), then the browser's Accept-Language, then Thai. Reasons:
 * a staff member who chose English on the site sees English here without
 * choosing twice, and there is exactly one URL per page, so no duplicate
 * `/th/admin` and `/en/admin` routes to protect and keep out of search.
 * (`?lang=` was rejected: it spreads into every link and cannot be
 * remembered.) The console's own language switch is a plain form that sets the
 * cookie on the server, so it works without JavaScript.
 */

import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LEGACY_LOCALE_COOKIE, LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from "@/lib/i18n/config";

export async function getAdminLocale(): Promise<Locale> {
  const store = await cookies();
  const stored = (store.get(LOCALE_COOKIE) ?? store.get(LEGACY_LOCALE_COOKIE))?.value;
  if (isLocale(stored)) return stored;
  const accept = (await headers()).get("accept-language");
  return accept ? negotiateLocale(accept) : DEFAULT_LOCALE;
}
