import { LOCALES } from "@/lib/i18n/config";

/**
 * A slug no content can have (slugs are lowercase letters, digits and
 * hyphens), whose page simply 404s.
 */
export const PLACEHOLDER_SLUG = "_";

/**
 * Static params for a `[locale]/<kind>/[slug]` route. Slugs published after
 * the build are rendered on first request and cached. When there is nothing to
 * list yet it returns a placeholder, so the route is still prerendered rather
 * than treated as having no static params.
 */
export function slugParams(slugs: readonly string[]): { locale: string; slug: string }[] {
  const list = slugs.length > 0 ? slugs : [PLACEHOLDER_SLUG];
  return LOCALES.flatMap((locale) => list.map((slug) => ({ locale, slug })));
}
