import { defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "./locale";

/**
 * A link to somewhere off this site: a government form, a faculty page, a
 * PDF. Used in `siteSettings.organisationLinks`, `policy.evidenceLinks`, and
 * in `relatedLinks` on content pages.
 */
export const externalLink = defineType({
  name: "externalLink",
  title: "External link",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "localeString",
      description: "The link text a student sees, in Thai and English. Say where it goes.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      description: "The full web address, including https://.",
      validation: (rule) => rule.required().uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "localeString",
      description: "Optional. One short line about what the student finds there.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "requiresSignIn",
      title: "Requires sign-in",
      type: "boolean",
      initialValue: false,
      description:
        "Turn this on if the destination needs an account the student may not have, for example a Google or TU account. This is shown as a warning before they click.",
    }),
  ],
  preview: {
    select: { title: "label.en", subtitle: "url" },
  },
});
