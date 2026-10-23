import type { LocaleString } from "@/lib/content/types";

/** What `RichText` needs to know about a form to draw a `formCallout`. */
export interface FormSummary {
  id: string;
  slug: string;
  title: LocaleString;
  purpose: LocaleString;
  requiresSignIn: boolean;
  signInType?: "google" | "tuAccount" | "other";
  isActive: boolean;
}

/** What `RichText` needs to know about an image to draw an `image` node. */
export interface ImageInfo {
  /** Public URL of the stored file (must be allowed by `images.remotePatterns` in next.config). */
  url: string;
}

/**
 * Referenced rows, fetched by the read layer before render (see
 * `collectRichTextRefs` in lib/rich-text/schema.ts). Keyed by the `formId` /
 * `imageId` attr. A missing key renders nothing for that block, the same as
 * an inactive form or an image with no asset did before.
 */
export interface ResolvedRefs {
  forms?: ReadonlyMap<string, FormSummary>;
  images?: ReadonlyMap<string, ImageInfo>;
}
