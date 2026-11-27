import { CalloutBoxBlock } from "@/components/domain/rich-text/blocks/CalloutBoxBlock";
import { ContactBlockRenderer } from "@/components/domain/rich-text/blocks/ContactBlock";
import { FormCalloutBlock } from "@/components/domain/rich-text/blocks/FormCalloutBlock";
import { ImageBlock } from "@/components/domain/rich-text/blocks/ImageBlock";
import { KeyFactsBlock } from "@/components/domain/rich-text/blocks/KeyFactsBlock";
import { LinkOutBlock } from "@/components/domain/rich-text/blocks/LinkOutBlock";
import { LiveTimelineBlock } from "@/components/domain/rich-text/blocks/LiveTimelineBlock";
import { StepListBlock } from "@/components/domain/rich-text/blocks/StepListBlock";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import { cleanBlockAttrs, type BlockType } from "@/lib/rich-text/editor";
import type {
  CalloutBoxAttrs, ContactBlockAttrs, FormCalloutAttrs, ImageAttrs,
  KeyFactsAttrs, LinkOutAttrs, LiveTimelineAttrs, StepListAttrs,
} from "@/lib/rich-text/schema";
import type { RichTextRefs } from "./blocks";

interface BlockPreviewProps {
  type: BlockType;
  attrs: Record<string, unknown>;
  locale: Locale;
  uiLocale: Locale;
  refs: RichTextRefs;
}

/** Uses the published renderers, with destinations and live countdowns disabled while editing. */
export function BlockPreview({ type, attrs: raw, locale, uiLocale, refs }: BlockPreviewProps) {
  const attrs = cleanBlockAttrs(type, raw);
  const headingLevel = 2;
  const empty = <p className="m-0 text-ink-600">{a("blockEmpty", uiLocale)}</p>;

  switch (type) {
    case "contactBlock":
      return attrs?.value ? <ContactBlockRenderer attrs={attrs as unknown as ContactBlockAttrs} locale={locale} preview /> : empty;
    case "formCallout": {
      const choice = refs.forms.find((form) => form.value === attrs?.formId);
      if (choice?.preview) {
        return <FormCalloutBlock attrs={attrs as unknown as FormCalloutAttrs} form={choice.preview} locale={locale} headingLevel={headingLevel} preview />;
      }
      return choice ? <p className="m-0 font-semibold">{pick(choice.label, locale)}</p> : empty;
    }
    case "image": {
      const image = refs.images.find((image) => image.id === attrs?.imageId);
      return image?.url ? (
        <ImageBlock attrs={attrs as unknown as ImageAttrs} image={{ url: image.url, width: image.width, height: image.height }} locale={locale} />
      ) : (
        <p className="m-0 text-ink-600">{a("imageMissing", uiLocale)}</p>
      );
    }
    case "linkOut":
      return attrs?.url ? <LinkOutBlock attrs={attrs as unknown as LinkOutAttrs} locale={locale} preview /> : empty;
    case "calloutBox": {
      const callout = attrs as unknown as CalloutBoxAttrs;
      return pick(callout?.body, locale) ? <CalloutBoxBlock attrs={callout} locale={locale} /> : empty;
    }
    case "stepList": {
      const list = attrs as unknown as StepListAttrs;
      return list.steps.length ? <StepListBlock attrs={list} locale={locale} headingLevel={headingLevel} /> : empty;
    }
    case "keyFacts": {
      const facts = attrs as unknown as KeyFactsAttrs;
      return facts.facts.length ? <KeyFactsBlock attrs={facts} locale={locale} headingLevel={headingLevel} /> : empty;
    }
    case "liveTimeline": {
      const timeline = attrs as unknown as LiveTimelineAttrs;
      return timeline.items.some((item) => Date.parse(item.endsAt) > Date.parse(item.startsAt))
        ? <LiveTimelineBlock attrs={timeline} locale={locale} headingLevel={headingLevel} preview />
        : empty;
    }
  }
}
