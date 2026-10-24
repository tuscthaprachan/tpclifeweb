import type { ImageChoice } from "@/lib/admin/content/images";
import type { AdminKey } from "@/lib/i18n/admin";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";
import type { BlockType } from "@/lib/rich-text/editor";
import type { ReferenceChoice } from "../ReferencePicker";

/** Pictures and forms the editor's custom blocks can point at. */
export interface RichTextRefs {
  images: ImageChoice[];
  forms: ReferenceChoice[];
  storageConfigured: boolean;
}

export const BLOCK_LABEL: Record<BlockType, AdminKey> = {
  contactBlock: "blockContact",
  formCallout: "blockForm",
  image: "blockImage",
  linkOut: "blockLinkOut",
  calloutBox: "blockCallout",
  stepList: "blockSteps",
};

type Raw = Record<string, unknown>;
const ls = (v: unknown, locale: Locale): string => {
  const o = (typeof v === "object" && v !== null ? v : {}) as { th?: string; en?: string };
  return pick({ th: o.th ?? "", en: o.en ?? "" }, locale);
};

/** One line saying what a block holds, for its card in the editor. */
export function summariseBlock(type: BlockType, attrs: Raw, locale: Locale, refs: RichTextRefs): string {
  switch (type) {
    case "contactBlock":
      return [ls(attrs.label, locale), String(attrs.value ?? "")].filter(Boolean).join(": ");
    case "formCallout": {
      const form = refs.forms.find((f) => f.value === attrs.formId);
      return form ? pick(form.label, locale) : a("imageMissing", locale);
    }
    case "image": {
      const image = refs.images.find((i) => i.id === attrs.imageId);
      if (!image) return a("imageMissing", locale);
      return attrs.isDecorative ? a("imageDecorative", locale) : ls(attrs.alt, locale) || pick({ th: image.altTh, en: image.altEn }, locale);
    }
    case "linkOut":
      return [ls(attrs.label, locale), String(attrs.url ?? "")].filter(Boolean).join(": ");
    case "calloutBox":
      return [ls(attrs.title, locale), ls(attrs.body, locale)].filter(Boolean).join(": ");
    case "stepList": {
      const steps = Array.isArray(attrs.steps) ? attrs.steps : [];
      return [ls(attrs.title, locale), a("blockStepCount", locale, { count: steps.length })].filter(Boolean).join(": ");
    }
  }
}
