import { defineField, defineType } from "sanity";

import { CATEGORY_OPTIONS, OWNER_OPTIONS } from "../constants";
import { bilingualBlockMessageOptional, bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

/**
 * A campus event. Registered as schema name `event`, matching `_type:
 * "event"` on `CampusEvent` in `lib/sanity/types.ts`.
 */
export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "localeString",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: (doc: Record<string, unknown>) => (doc.title as { en?: string } | undefined)?.en ?? "" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "localeText",
      description: "Shown in lists and link previews. One or two sentences.",
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "localeBlock",
      description: "Optional. Full detail about the event.",
      validation: (rule) => rule.custom(bilingualBlockMessageOptional),
    }),
    defineField({
      name: "startsAt",
      title: "Starts at",
      type: "datetime",
      description: "Bangkok time.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "endsAt",
      title: "Ends at",
      type: "datetime",
      description: "Optional. Bangkok time.",
      validation: (rule) =>
        rule.custom((value: string | undefined, context) => {
          if (!value) return true;
          const parent = context.parent as { startsAt?: string } | undefined;
          if (parent?.startsAt && new Date(value).getTime() <= new Date(parent.startsAt).getTime()) {
            return "The end time must be after the start time.";
          }
          return true;
        }),
    }),
    defineField({
      name: "isAllDay",
      title: "All day",
      type: "boolean",
      initialValue: false,
      description: "Turn this on when the event is a whole day and no clock time should be shown.",
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "localeString",
      description: "Optional. Use this for a quick free-text location. Link to a full place record instead if one exists.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "place",
      title: "Place",
      type: "reference",
      to: [{ type: "place" }],
      description: "Optional. Link to a place record for opening hours and a map position.",
    }),
    defineField({
      name: "owner",
      title: "Owner",
      type: "string",
      description: "Which body runs this event. Every governance item must be attributed to someone.",
      options: { list: OWNER_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Optional. Drives which colour this event is tagged with.",
      options: { list: CATEGORY_OPTIONS },
    }),
    defineField({
      name: "cover",
      title: "Cover image",
      type: "image",
      description: "Optional.",
    }),
    defineField({
      name: "relatedForm",
      title: "Related form",
      type: "reference",
      to: [{ type: "form" }],
      description: "Optional. A form the student must file to take part, if there is one.",
    }),
    defineField({
      name: "registrationUrl",
      title: "Registration URL",
      type: "url",
      description: "Optional. Only if registration is not already covered by the related form above.",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "isCancelled",
      title: "Cancelled",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "cancellationNote",
      title: "Cancellation note",
      type: "localeString",
      description: "Optional, but worth filling in whenever the event above is cancelled. Say why, in Thai and English.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
  ],
  preview: {
    select: { title: "title.en", startsAt: "startsAt", isCancelled: "isCancelled" },
    prepare({ title, startsAt, isCancelled }) {
      const startDate = typeof startsAt === "string" ? new Date(startsAt).toLocaleString("en-GB") : undefined;
      return {
        title: ((title as string | undefined) || "Untitled event") + (isCancelled ? " (cancelled)" : ""),
        subtitle: startDate,
      };
    },
  },
});
