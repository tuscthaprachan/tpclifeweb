import { defineArrayMember, defineField, defineType } from "sanity";

import { CATEGORY_OPTIONS } from "../constants";
import { bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

/**
 * A physical place on campus: a building, an office, a service counter.
 * Registered as schema name `place`, matching `_type: "place"` on
 * `CampusPlace` in `lib/sanity/types.ts`.
 */
export const place = defineType({
  name: "place",
  title: "Place",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "localeString",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: (doc: Record<string, unknown>) => (doc.name as { en?: string } | undefined)?.en ?? "" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "building",
      title: "Building",
      type: "localeString",
      description: "Optional. Which building this is in, if it is not obvious from the name.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "localeText",
      description: "Optional.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: { list: CATEGORY_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "openingHours",
      title: "Opening hours",
      type: "array",
      of: [defineArrayMember({ type: "openingHours" })],
      description: "Optional. Add one entry per group of days that share the same hours.",
    }),
    defineField({
      name: "closureNote",
      title: "Closure note",
      type: "localeString",
      description: "Optional. Shown when the place is closed for a reason worth stating, for example renovation.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "lat",
      title: "Latitude",
      type: "number",
      description: "Optional. Only add this if you have a real, checked coordinate.",
    }),
    defineField({
      name: "lng",
      title: "Longitude",
      type: "number",
      description: "Optional. Only add this if you have a real, checked coordinate.",
    }),
    defineField({
      name: "isKeyLocation",
      title: "Key location",
      type: "boolean",
      initialValue: false,
      description: "Turn this on for places students most often need. Shown on the at-a-glance panel.",
    }),
  ],
  preview: {
    select: { title: "name.en", subtitle: "building.en" },
  },
});
