import Image from "next/image";

import { pick, type Locale } from "@/lib/i18n/config";
import { hasImageAsset, urlFor } from "@/lib/sanity/image";
import type { SanityImage } from "@/lib/sanity/types";

export type ImageValue = SanityImage & { _type: "siteImage"; _key: string };

// Fixed output aspect ratio for body images. The source asset's own aspect
// ratio is not queried here (that would need a per-image round trip to read
// asset metadata, which the fixed queries in lib/sanity/queries.ts do not
// fetch for embedded Portable Text objects). Cropping to a known ratio through
// the image pipeline avoids the alternative failure mode, a next/image whose
// width/height attributes do not match its real source and so distorts.
const WIDTH = 1600;
const HEIGHT = 900;

/**
 * The schema's custom image type (`sanity/schemas/objects/siteImage.ts`):
 * bilingual alt text, or `alt=""` when `isDecorative` is on (1.1.1), plus an
 * optional bilingual caption.
 */
export function ImageBlock({ value, locale }: { value: ImageValue; locale: Locale }) {
  // `hasImageAsset` rather than `!value?.asset`: an interrupted upload leaves
  // an `asset` object with no `_ref` inside it, which passes a plain
  // truthiness check and then throws inside `urlFor(...).url()` below,
  // taking down the whole article rather than one figure.
  if (!hasImageAsset(value)) return null;

  const alt = value.isDecorative ? "" : pick(value.alt, locale);
  const caption = value.caption ? pick(value.caption, locale) : "";
  const src = urlFor(value).width(WIDTH).height(HEIGHT).fit("crop").auto("format").url();

  return (
    <figure className="m-0">
      <div className="relative w-full overflow-hidden rounded-panel bg-surface-sunk" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <Image src={src} alt={alt} fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
      </div>
      {caption ? <figcaption className="mt-[var(--space-2)] text-sm text-ink-600">{caption}</figcaption> : null}
    </figure>
  );
}
