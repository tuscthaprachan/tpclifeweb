import { defineArrayMember, defineField, defineType } from "sanity";

import { bilingualStringMessage } from "./locale";

/**
 * One link in the primary or footer navigation. Can have children for a
 * dropdown, but keep nesting to one level so the menu stays usable on a
 * phone.
 */
export const navItem = defineType({
  name: "navItem",
  title: "Navigation item",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "localeString",
      description: "The link text, in Thai and English.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "path",
      title: "Path",
      type: "string",
      description:
        'The page this links to, starting with a slash and without the language prefix, for example "/forms" or "/shuttle". The site adds the /th or /en prefix automatically.',
      validation: (rule) =>
        rule
          .required()
          .custom((value: string | undefined) =>
            !value || value.startsWith("/") ? true : "The path must start with a slash, for example /forms.",
          ),
    }),
    defineField({
      name: "children",
      title: "Submenu items",
      type: "array",
      of: [defineArrayMember({ type: "navItem" })],
      description: "Optional. Items shown in a dropdown under this one. Keep this to one level.",
    }),
  ],
  preview: {
    select: { title: "label.en", subtitle: "path" },
  },
});
