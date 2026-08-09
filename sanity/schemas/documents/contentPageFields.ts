import { defineArrayMember, defineField, type FieldDefinition } from "sanity";

import { CATEGORY_OPTIONS } from "../constants";
import { bilingualBlockMessage, bilingualStringMessage } from "../objects/locale";

/**
 * The shared field list behind `welfarePage` and `guidePage`, both of which
 * implement the `ContentPage` interface in `lib/sanity/types.ts` and differ
 * only in their `_type`. `selfType` is the current schema's own name, used
 * so `relatedPages` can reference either content page type without a page
 * accidentally being excluded from its own related-pages picker options.
 */
export function contentPageFields(selfType: "welfarePage" | "guidePage"): FieldDefinition[] {
  return [
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: (doc: Record<string, unknown>) => (doc.title as { en?: string } | undefined)?.en ?? "" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "localeText",
      description: "Shown in lists and link previews. One or two sentences.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "localeBlock",
      validation: (rule) => rule.required().custom(bilingualBlockMessage),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: { list: CATEGORY_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "relatedForms",
      title: "Related forms",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "form" }] })],
      description: "Optional. Forms a student is likely to need after reading this page.",
    }),
    defineField({
      name: "relatedLinks",
      title: "Related links",
      type: "array",
      of: [defineArrayMember({ type: "externalLink" })],
      description: "Optional. Links off this site that are relevant here.",
    }),
    defineField({
      name: "relatedPages",
      title: "Related pages",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "welfarePage" }, { type: "guidePage" }] })],
      description: "Optional. Other welfare or guide pages worth reading next.",
      validation: (rule) =>
        rule.custom((value: Array<{ _ref?: string }> | undefined, context) => {
          if (!Array.isArray(value)) return true;
          const document = context.document as { _id?: string } | undefined;
          const selfId = typeof document?._id === "string" ? document._id.replace(/^drafts\./, "") : undefined;
          const referencesSelf = selfId && value.some((item) => item?._ref?.replace(/^drafts\./, "") === selfId);
          return referencesSelf ? `A ${selfType} page cannot list itself as a related page.` : true;
        }),
    }),
    defineField({
      name: "lastReviewed",
      title: "Last reviewed",
      type: "date",
      description:
        "The date someone last checked this page is still correct. This drives the \"not reviewed since\" list in the Studio, so keep it up to date rather than leaving it blank.",
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Optional. Lower numbers show first when this page is listed alongside others.",
    }),
  ];
}
