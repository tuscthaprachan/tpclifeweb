import type { HeadingLevel } from "@/lib/a11y";

/**
 * Clamps an arbitrary integer into the 2..6 range of `HeadingLevel`.
 *
 * Body content only ever offers h2 to h4 (see `HEADING_LEVELS` in
 * `lib/rich-text/schema.ts`), so an editor can never author an h1 from inside
 * a page body. This clamp is the defensive
 * second layer: even if a caller ever passed `headingLevel={1}` into the
 * renderer by mistake, the lowest heading this component can produce is h2,
 * so the page's own single h1 (1.3.1, 2.4.6) can never be duplicated from
 * here.
 */
export function clampHeadingLevel(level: number): HeadingLevel {
  const clamped = Math.min(6, Math.max(2, Math.round(level)));
  return clamped as HeadingLevel;
}
