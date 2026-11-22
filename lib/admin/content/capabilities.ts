/**
 * Which content types have which lifecycle tools. Plain data, safe to import
 * from client components; `lifecycle.ts` holds the database side of the same
 * types.
 */

/** Types with publish and unpublish times (they have a public page or list). */
export const SCHEDULED_SEGMENTS: readonly string[] = ["news", "events", "topics", "policies", "faqs", "forms"];

/** Types with a public detail page a draft can be previewed on. */
export const PREVIEW_SEGMENTS: readonly string[] = ["news", "events", "topics", "policies", "forms"];

/** Types with restore and duplicate. History is available for every collection type. */
export const REVERTIBLE_SEGMENTS: readonly string[] = ["alerts", "news", "events", "policies", "guides", "welfare", "faqs", "forms"];

export const isScheduledSegment = (segment: string): boolean => SCHEDULED_SEGMENTS.includes(segment);
export const isPreviewableSegment = (segment: string): boolean => PREVIEW_SEGMENTS.includes(segment);
export const isRevertibleSegment = (segment: string): boolean => REVERTIBLE_SEGMENTS.includes(segment);

/** The public route segment (after the locale) of each previewable type's detail page. Topic pages are absent: their path depends on the row, see `previewPath` in preview-path.ts. */
export const PREVIEW_ROUTE: Record<string, string> = {
  news: "/news",
  events: "/events",
  policies: "/policy",
  forms: "/forms",
};
