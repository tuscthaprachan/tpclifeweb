import { LOCALES } from "@/lib/i18n/config";

/**
 * A slug no content can have (slugs are lowercase letters, digits and
 * hyphens), whose page simply 404s.
 */
export const PLACEHOLDER_SLUG = "_";

/**
 * Static params for a `[locale]/<kind>/[slug]` route. When there is nothing to
 * list yet it returns a placeholder instead of an empty list: Next records an
 * empty list as "prerendered with no fallback", and with `dynamicParams =
 * false` on the locale layout every slug published after the build would 404.
 */
export function slugParams(slugs: readonly string[]): { locale: string; slug: string }[] {
  const list = slugs.length > 0 ? slugs : [PLACEHOLDER_SLUG];
  return LOCALES.flatMap((locale) => list.map((slug) => ({ locale, slug })));
}
