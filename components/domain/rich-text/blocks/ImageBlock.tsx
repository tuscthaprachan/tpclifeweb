import { ProportionalImage } from "@/components/domain/media/ProportionalImage";
import { pick, type Locale } from "@/lib/i18n/config";
import type { ImageAttrs } from "@/lib/rich-text/schema";
import type { ImageInfo } from "../types";

/**
 * Bilingual alt text, or `alt=""` when `isDecorative` is on (1.1.1), plus an
 * optional bilingual caption.
 */
export function ImageBlock({ attrs, image, locale }: { attrs: ImageAttrs; image: ImageInfo | undefined; locale: Locale }) {
  if (!image?.url) return null;

  const alt = attrs.isDecorative ? "" : pick(attrs.alt, locale);
  const caption = attrs.caption ? pick(attrs.caption, locale) : "";

  return (
    <figure className="m-0">
      <ProportionalImage src={image.url} alt={alt} width={image.width} height={image.height} />
      {caption ? <figcaption className="mt-[var(--space-2)] text-sm text-ink-600">{caption}</figcaption> : null}
    </figure>
  );
}
