import { defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "./locale";

/**
 * One stop on a shuttle route. Stops are ordered in the list as the shuttle
 * actually visits them, first stop first.
 */
export const shuttleStop = defineType({
  name: "shuttleStop",
  title: "Shuttle stop",
  type: "object",
  fields: [
    defineField({
      name: "name",
      title: "Stop name",
      type: "localeString",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "offsetMinutes",
      title: "Minutes after departure",
      type: "number",
      description:
        "How many minutes after the shuttle leaves the first stop it reaches this one. The first stop in the list is the origin, so it should be 0.",
      validation: (rule) => rule.required().min(0).integer(),
    }),
    defineField({
      name: "note",
      title: "Note",
      type: "localeString",
      description: 'Optional. Anything a student needs to know about this stop, for example "opposite the main gate".',
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
  ],
  preview: {
    select: { title: "name.en", subtitle: "offsetMinutes" },
    prepare({ title, subtitle }: { title?: string; subtitle?: number }) {
      return {
        title: title || "Untitled stop",
        subtitle: typeof subtitle === "number" ? `+${subtitle} min` : undefined,
      };
    },
  },
});
