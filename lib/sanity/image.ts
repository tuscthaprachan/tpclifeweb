import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";

import { client } from "./client";
import { dataset, projectId } from "./env";
import type { SanityImage } from "./types";

const builder = createImageUrlBuilder(client);

/**
 * Builds an image URL from a Sanity image field. Accepts either the site's
 * own `SanityImage` shape (asset reference, plus alt text and caption that
 * this builder ignores) or any other valid Sanity image source, so it also
 * works with an asset reference alone.
 *
 * Callers still need to render `alt` themselves: this only builds the `src`.
 * An image with no alt text and no `isDecorative` flag should never reach
 * this function without one, that is what the schema validation is for.
 *
 * This does NOT guard against a missing asset reference. `siteImage` fields
 * are optional and their `asset` sub-field is not required by schema
 * validation, so a document can be published with a `cover` or `gallery`
 * entry that was started and never actually given a file. `@sanity/image-url`
 * throws out of `.url()` in that case (`Unable to resolve image URL from
 * source`), not out of this function, because the builder only resolves the
 * source lazily when a URL is asked for. Call `hasImageAsset` first and skip
 * rendering entirely when it says no, rather than reaching this function with
 * a half-uploaded image.
 *
 * @example
 * urlFor(newsPost.cover).width(800).height(450).fit("crop").url()
 */
export function urlFor(source: SanityImage | SanityImageSource) {
  return builder.image(source);
}

/**
 * True when a `SanityImage` field actually has a file behind it. An editor
 * can save a `siteImage` object (isDecorative, alt, caption) before ever
 * uploading a file, or an upload can be interrupted, so `asset` is not
 * guaranteed even though the schema requires alt text on a non-decorative
 * image. Every place that renders `cover` or `gallery` must check this before
 * calling `urlFor`, so a half-uploaded image degrades to "not shown" instead
 * of throwing and taking the whole page down with it.
 */
export function hasImageAsset(image: SanityImage | null | undefined): image is SanityImage & { asset: { _ref: string } } {
  return Boolean(image?.asset?._ref);
}

/** Re-exported so callers that already have projectId/dataset do not need a second import. */
export const imageProjectDetails = { projectId, dataset };
