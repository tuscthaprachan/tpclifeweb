import { defineArrayMember, defineField, defineType } from "sanity";

import { WEEKDAY_OPTIONS } from "../constants";

/**
 * Which days a shuttle route runs. Most TPC services are weekday only, so
 * this is built around a weekly pattern plus one-off exceptions rather than
 * a plain list of every running date.
 */
export const serviceCalendar = defineType({
  name: "serviceCalendar",
  title: "Service calendar",
  type: "object",
  fields: [
    defineField({
      name: "daysOfWeek",
      title: "Runs on these days",
      type: "array",
      of: [defineArrayMember({ type: "number" })],
      options: { list: WEEKDAY_OPTIONS },
      description: "Tick every day of the week this service normally runs.",
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error("Pick at least one day of the week.")
          .custom((value: number[] | undefined) => {
            if (!value) return true;
            const inRange = value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
            return inRange || "Days must be whole numbers from 0 (Sunday) to 6 (Saturday).";
          }),
    }),
    defineField({
      name: "excludedDates",
      title: "Dates with no service",
      type: "array",
      of: [defineArrayMember({ type: "date" })],
      description:
        "Optional. Specific dates the service does not run even though it normally would, for example a public holiday.",
    }),
    defineField({
      name: "addedDates",
      title: "Extra service dates",
      type: "array",
      of: [defineArrayMember({ type: "date" })],
      description: "Optional. Specific dates the service runs even though the weekly pattern says it would not.",
    }),
    defineField({
      name: "validFrom",
      title: "Valid from",
      type: "date",
      description: "Optional. The first date this timetable applies from.",
    }),
    defineField({
      name: "validUntil",
      title: "Valid until",
      type: "date",
      description: "Optional. The last date this timetable applies. Leave empty if it has no planned end.",
    }),
  ],
});
