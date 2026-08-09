import { defineArrayMember, defineField, defineType } from "sanity";

import { WEEKDAY_OPTIONS } from "../constants";
import { bilingualStringMessageOptional } from "./locale";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeMessage(value: string | undefined): true | string {
  if (!value) return true;
  return TIME_PATTERN.test(value) ? true : "Use 24-hour time as HH:mm, for example 09:00 or 17:30.";
}

/**
 * One block of opening hours for a place, for example "Monday to Friday,
 * 08:30 to 16:30". A place can have several of these for different day
 * groups.
 */
export const openingHours = defineType({
  name: "openingHours",
  title: "Opening hours",
  type: "object",
  fields: [
    defineField({
      name: "daysOfWeek",
      title: "Days",
      type: "array",
      of: [defineArrayMember({ type: "number" })],
      options: { list: WEEKDAY_OPTIONS },
      validation: (rule) => rule.required().min(1).error("Pick at least one day of the week."),
    }),
    defineField({
      name: "opens",
      title: "Opens",
      type: "string",
      description: "24-hour time, for example 08:30.",
      validation: (rule) => rule.required().custom(timeMessage),
    }),
    defineField({
      name: "closes",
      title: "Closes",
      type: "string",
      description: "24-hour time, for example 16:30.",
      validation: (rule) => rule.required().custom(timeMessage),
    }),
    defineField({
      name: "note",
      title: "Note",
      type: "localeString",
      description: 'Optional. For example "closes early on the last Friday of the month".',
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
  ],
  preview: {
    select: { opens: "opens", closes: "closes" },
    prepare({ opens, closes }: { opens?: string; closes?: string }) {
      return { title: opens && closes ? `${opens} to ${closes}` : "Opening hours" };
    },
  },
});
