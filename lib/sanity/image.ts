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
 * @example
 * urlFor(newsPost.cover).width(800).height(450).fit("crop").url()
 */
export function urlFor(source: SanityImage | SanityImageSource) {
  return builder.image(source);
}

/** Re-exported so callers that already have projectId/dataset do not need a second import. */
export const imageProjectDetails = { projectId, dataset };
