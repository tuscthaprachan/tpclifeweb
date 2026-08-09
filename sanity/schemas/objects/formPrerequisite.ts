import { defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "./locale";

/**
 * One thing a student should have ready before they start a form, shown as
 * a checklist item. For example "Your student ID card" or "A photo of the
 * damage".
 */
export const formPrerequisite = defineType({
  name: "formPrerequisite",
  title: "Prerequisite",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "localeString",
      description: "The checklist item itself, short, in Thai and English.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "detail",
      title: "Detail",
      type: "localeText",
      description: "Optional. Extra explanation if the checklist item on its own is not enough.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
  ],
  preview: {
    select: { title: "label.en" },
  },
});
