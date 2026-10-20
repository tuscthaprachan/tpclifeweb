/**
 * Builds the two exports an `opengraph-image.tsx` needs from one resolver, so
 * the alt text and the picture can never describe different things.
 * `generateImageMetadata` is used rather than a static `alt` export because
 * the alt has to be in the page's language and name the page's own title.
 *
 *   const og = ogImageRoute<{ locale: string; slug: string }>(async ({ locale, slug }) => ({ ... }));
 *   export const generateImageMetadata = og.generateImageMetadata;
 *   export default og.Image;
 *
 * A resolver that cannot find its document should return the section's
 * generic content rather than throw: a share image must never 500.
 */

import type { Locale } from "@/lib/i18n/config";

import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, ogLocale, renderOgImage, type OgContent } from "./render";

type Resolver<P> = (params: P & { locale: Locale }) => Promise<OgContent> | OgContent;

export function ogImageRoute<P extends { locale: string }>(resolve: Resolver<Omit<P, "locale">>) {
  const content = (params: P) => resolve({ ...params, locale: ogLocale(params.locale) });

  return {
    async generateImageMetadata({ params }: { params: P | Promise<P> }) {
      return [{ id: "og", alt: ogAlt(await content(await params)), size: OG_SIZE, contentType: OG_CONTENT_TYPE }];
    },
    async Image({ params }: { params: Promise<P> }) {
      return renderOgImage(await content(await params));
    },
  };
}
