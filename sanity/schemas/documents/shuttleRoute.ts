import { defineArrayMember, defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function departuresMessage(value: string[] | undefined): true | string {
  if (!value) return true;
  for (const time of value) {
    if (!TIME_PATTERN.test(time)) {
      return `"${time}" is not a valid time. Use 24-hour HH:mm, for example 07:30.`;
    }
  }
  const sorted = value.every((time, index) => {
    if (index === 0) return true;
    const previous = value[index - 1];
    return previous !== undefined && previous <= time;
  });
  return sorted || "List departure times in order from earliest to latest.";
}

/**
 * A shuttle route with its stops and timetable. There is no GPS feed and no
 * public API for the Thammasat Tha Prachan shuttle, so everything shown to students is
 * computed from this timetable and must always be labelled scheduled, never
 * live.
 */
export const shuttleRoute = defineType({
  name: "shuttleRoute",
  title: "Shuttle route",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Route name",
      type: "localeString",
      description: 'For example "Thammasat Tha Prachan to Central Pinklao".',
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
      name: "description",
      title: "Description",
      type: "localeText",
      description: "Optional. A short summary of the route.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "stops",
      title: "Stops",
      type: "array",
      of: [defineArrayMember({ type: "shuttleStop" })],
      description: "In the order the shuttle actually visits them. The first stop is the origin.",
      validation: (rule) => rule.required().min(1).error("Add at least one stop, starting with the origin."),
    }),
    defineField({
      name: "calendar",
      title: "Service calendar",
      type: "serviceCalendar",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "departures",
      title: "Departure times",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      description:
        "Departure times from the origin, in 24-hour HH:mm, Bangkok time, earliest first, for example 07:30.",
      validation: (rule) =>
        rule.required().min(1).error("Add at least one departure time.").custom(departuresMessage),
    }),
    defineField({
      name: "fare",
      title: "Fare",
      type: "localeString",
      description: 'Optional. For example "Free with student ID" or a price.',
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "localeText",
      description: "Optional. Anything else a student should know, for example what to show when boarding.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "realtimeFeedUrl",
      title: "Realtime feed URL",
      type: "url",
      description:
        "Leave this empty. Set it only if a genuine realtime tracking feed ever exists for this route. While it is empty, the site shows scheduled times and must never claim live tracking. Do not add a pulsing dot, a live badge, or a countdown styled to imply tracking.",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: false,
      description:
        "Turn this on only once the stops and departure times have been checked against a real, current source. There is no published shuttle timetable yet, so this should stay off until TUSU confirms one.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sourceNote",
      title: "Source note",
      type: "localeString",
      description: "Optional. Where this timetable came from, so a future editor can verify or update it.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "lastVerified",
      title: "Last verified",
      type: "date",
      description: "The date someone last checked this timetable is still correct.",
    }),
  ],
  preview: {
    select: { title: "name.en", isActive: "isActive" },
    prepare({ title, isActive }: { title?: string; isActive?: boolean }) {
      return { title: title || "Untitled route", subtitle: isActive ? "Active" : "Not active" };
    },
  },
});
