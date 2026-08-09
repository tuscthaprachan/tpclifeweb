import { PortableText, type PortableTextComponents } from "@portabletext/react";

import { Heading, Prose } from "@/components/ui";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";
import type { PortableTextBlock } from "@/lib/sanity/types";
import { CalloutBoxBlock, type CalloutBoxValue } from "./blocks/CalloutBoxBlock";
import { ContactBlockRenderer, type ContactBlockValue } from "./blocks/ContactBlock";
import { FormCalloutBlock, type FormCalloutValue } from "./blocks/FormCalloutBlock";
import { ImageBlock, type ImageValue } from "./blocks/ImageBlock";
import { LinkOutBlock, type LinkOutValue } from "./blocks/LinkOutBlock";
import { StepListBlock, type StepListValue } from "./blocks/StepListBlock";
import { clampHeadingLevel } from "./headingLevel";

interface PortableTextRendererProps {
  /** One language side of a `LocaleBlock`, e.g. `newsPost.body[locale]`. */
  value: PortableTextBlock[] | null | undefined;
  locale: Locale;
  /**
   * The outline depth an `h2` written in the CMS should render at on this
   * page. `h3` and `h4` in the body offset from this by one and two levels.
   * Always clamped to 2 or deeper, so body content can never produce the
   * page's own h1.
   */
  headingLevel: HeadingLevel;
  className?: string;
}

/**
 * The block styles editors can choose from (`BLOCK_STYLES` in
 * `sanity/schemas/objects/portableText.ts`) stop at h4, so only three offsets
 * are needed here. Typed as a total `Record` over the literal key union
 * (rather than `Record<string, number>`) so the lookups below are known to
 * always produce a `number`, not `number | undefined`, under
 * `noUncheckedIndexedAccess`.
 */
const STYLE_OFFSET: Record<"h2" | "h3" | "h4", number> = { h2: 0, h3: 1, h4: 2 };

function buildComponents(locale: Locale, headingLevel: HeadingLevel): PortableTextComponents {
  const bodyLevel = clampHeadingLevel(headingLevel);

  return {
    block: {
      normal: ({ children }) => <p>{children}</p>,
      blockquote: ({ children }) => (
        <blockquote className="border-l-[var(--border-width-thick)] border-line-strong pl-[var(--space-4)] py-[var(--space-1)] text-ink-900 italic">
          {children}
        </blockquote>
      ),
      h2: ({ children }) => <Heading level={clampHeadingLevel(headingLevel + STYLE_OFFSET.h2)}>{children}</Heading>,
      h3: ({ children }) => <Heading level={clampHeadingLevel(headingLevel + STYLE_OFFSET.h3)}>{children}</Heading>,
      h4: ({ children }) => <Heading level={clampHeadingLevel(headingLevel + STYLE_OFFSET.h4)}>{children}</Heading>,
    },
    list: {
      bullet: ({ children }) => <ul className="m-0 flex list-disc flex-col gap-[var(--space-2)] pl-[var(--space-6)]">{children}</ul>,
      number: ({ children }) => <ol className="m-0 flex list-decimal flex-col gap-[var(--space-2)] pl-[var(--space-6)]">{children}</ol>,
    },
    listItem: {
      bullet: ({ children }) => <li>{children}</li>,
      number: ({ children }) => <li>{children}</li>,
    },
    marks: {
      strong: ({ children }) => <strong>{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
    },
    types: {
      image: ({ value }: { value: ImageValue }) => <ImageBlock value={value} locale={locale} />,
      formCallout: ({ value }: { value: FormCalloutValue }) => (
        <FormCalloutBlock value={value} locale={locale} headingLevel={bodyLevel} />
      ),
      linkOut: ({ value }: { value: LinkOutValue }) => <LinkOutBlock value={value} locale={locale} />,
      calloutBox: ({ value }: { value: CalloutBoxValue }) => <CalloutBoxBlock value={value} locale={locale} />,
      stepList: ({ value }: { value: StepListValue }) => <StepListBlock value={value} locale={locale} headingLevel={bodyLevel} />,
      contactBlock: ({ value }: { value: ContactBlockValue }) => <ContactBlockRenderer value={value} locale={locale} />,
    },
  };
}

/**
 * The shared renderer for every `LocaleBlock` body on the site: news, events,
 * welfare, guide. `Prose`-wrapped so the reading measure and vertical rhythm
 * come from the same place as every other rich text block. Never uses
 * `dangerouslySetInnerHTML`; every node type is a real React component.
 */
export function PortableTextRenderer({ value, locale, headingLevel, className }: PortableTextRendererProps) {
  if (!value || value.length === 0) return null;

  return (
    <Prose locale={locale} className={className}>
      <PortableText value={value} components={buildComponents(locale, headingLevel)} />
    </Prose>
  );
}
