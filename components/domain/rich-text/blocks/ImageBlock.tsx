import Image from "next/image";

import { pick, type Locale } from "@/lib/i18n/config";
import type { ImageAttrs } from "@/lib/rich-text/schema";
import type { ImageInfo } from "../types";

// Fixed 16:9 frame for body images, cropped with object-cover. The stored
// file's own aspect ratio is deliberately not relied on, so a next/image
// whose width/height do not match its real source cannot distort.
const WIDTH = 1600;
const HEIGHT = 900;

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
      <div className="relative w-full overflow-hidden rounded-panel bg-surface-sunk" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <Image src={image.url} alt={alt} fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
      </div>
      {caption ? <figcaption className="mt-[var(--space-2)] text-sm text-ink-600">{caption}</figcaption> : null}
    </figure>
  );
}
