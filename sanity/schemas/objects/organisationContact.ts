import { defineField, defineType } from "sanity";

import { bilingualStringMessageOptional } from "./locale";

/**
 * One way to reach a club, committee or independent group. Most TPC
 * organisations run entirely on Instagram, so that is listed first.
 */
export const organisationContact = defineType({
  name: "organisationContact",
  title: "Contact",
  type: "object",
  fields: [
    defineField({
      name: "channel",
      title: "Channel",
      type: "string",
      options: {
        list: [
          { title: "Instagram", value: "instagram" },
          { title: "Facebook", value: "facebook" },
          { title: "LINE", value: "line" },
          { title: "Email", value: "email" },
          { title: "Phone", value: "phone" },
          { title: "Website", value: "website" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "value",
      title: "Value",
      type: "string",
      description:
        "The handle, address or number itself. For Instagram and Facebook, just the handle without the @ or full URL.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "label",
      title: "Label",
      type: "localeString",
      description: "Optional. Only needed if the channel alone does not explain what this contact is for.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
  ],
  preview: {
    select: { title: "value", subtitle: "channel" },
  },
});
