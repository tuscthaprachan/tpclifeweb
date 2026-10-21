import type { ReactNode } from "react";
import { headingTag, type HeadingLevel } from "@/lib/a11y";

const TEXT_TOKEN: Record<HeadingLevel, string> = {
  1: "var(--text-3xl)",
  2: "var(--text-xl)",
  3: "var(--text-lg)",
  4: "var(--text-base)",
  5: "var(--text-base)",
  6: "var(--text-base)",
};

interface HeadingProps {
  /** The real depth in the document outline (1.3.1, 2.4.6). Never guess this from how big the text should look. */
  level: HeadingLevel;
  children: ReactNode;
  className?: string;
  id?: string;
  /**
   * Overrides the visual size only, when the outline depth and the type
   * scale genuinely need to diverge (an h2 that must look like an h1 inside
   * a card, for example). Leave unset in every ordinary case: the tag
   * chosen by `level` already carries the right size from typography.css.
   */
  visualLevel?: HeadingLevel;
}

/**
 * Renders whatever heading tag the page outline calls for. Never hardcode
 * h2. Every other component that needs a heading (Panel, ErrorSummary,
 * Dialog, Accordion, the /design catalogue) renders this one rather than
 * repeating the pattern below, so the eslint-disable stays in exactly one
 * place.
 */
export function Heading({ level, children, className, id, visualLevel }: HeadingProps) {
  const Tag = headingTag(level);
  const style = visualLevel !== undefined && visualLevel !== level ? { fontSize: TEXT_TOKEN[visualLevel] } : undefined;
  return (
    // react-hooks/static-components assumes a capitalised JSX tag is a
    // component whose identity must stay stable across renders. `Tag` here
    // is never anything but a fixed intrinsic tag name ("h1".."h6") chosen
    // once from the `level` prop, so there is no component identity to lose.
    // eslint-disable-next-line react-hooks/static-components
    <Tag id={id} className={className} style={style}>
      {children}
    </Tag>
  );
}
