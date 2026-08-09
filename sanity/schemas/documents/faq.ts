import { defineArrayMember, defineField, defineType } from "sanity";

import { CATEGORY_OPTIONS } from "../constants";
import { bilingualBlockMessage, bilingualStringMessage } from "../objects/locale";

/**
 * One frequently asked question. Kept as its own document type, rather than
 * folded into content pages, so it can be pulled into the search index and
 * ranked on its own.
 */
export const faq = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  fields: [
    defineField({
      name: "question",
      title: "Question",
      type: "localeString",
      description: "Written the way a student would actually ask it.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "answer",
      title: "Answer",
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
      description: "Optional. Forms this question is really about.",
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Optional. Lower numbers show first when FAQs are listed together.",
    }),
  ],
  preview: {
    select: { title: "question.en", category: "category" },
    prepare({ title, category }) {
      return {
        title: (title as string | undefined) || "Untitled question",
        subtitle: category as string | undefined,
      };
    },
  },
});
