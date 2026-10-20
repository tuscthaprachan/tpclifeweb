import { defineArrayMember, defineField, defineType } from "sanity";

import { CANTEEN_CUISINE_OPTIONS, HALAL_OPTIONS } from "../constants";
import { bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

/** A whole, non-negative number of grid cells. */
function wholeNumber(min: number) {
  return (value: number | undefined): true | string => {
    if (value === undefined) return true;
    if (!Number.isInteger(value)) return "Use a whole number.";
    return value >= min ? true : `Use ${min} or more.`;
  };
}

/**
 * A food stall in the canteen. Registered as schema name `canteenStall`,
 * matching `_type: "canteenStall"` on `CanteenStall` in `lib/sanity/types.ts`.
 *
 * The stall's halal and vegetarian answers are the stall's own word. They
 * are recorded with the date they were asked and shown as "stall says",
 * never as a guarantee.
 */
export const canteenStall = defineType({
  name: "canteenStall",
  title: "Canteen stall",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "localeString",
      description: "The stall name as the owner prefers it written.",
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
      name: "number",
      title: "Stall number",
      type: "number",
      description: "The number painted on the stall.",
      validation: (rule) => rule.required().custom(wholeNumber(1)),
    }),
    defineField({
      name: "cuisine",
      title: "Cuisine",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: { list: CANTEEN_CUISINE_OPTIONS },
      description: "Pick every kind of food the stall sells.",
      validation: (rule) => rule.required().min(1).error("Pick at least one cuisine."),
    }),
    defineField({
      name: "halal",
      title: "Halal",
      type: "string",
      options: { list: HALAL_OPTIONS, layout: "radio" },
      initialValue: "none",
      description:
        'Use "Stall says" when the stall told you it is halal. Use "Certified" only when a halal certificate is on file. Never mark a stall halal from its name or menu.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "halalCheckedOn",
      title: "Halal asked on",
      type: "date",
      description: "The date you asked the stall. Required when the stall is marked halal.",
      validation: (rule) =>
        rule.custom((value: string | undefined, context) => {
          const halal = (context.parent as { halal?: string } | undefined)?.halal;
          if (halal && halal !== "none" && !value) return "Add the date you asked the stall about halal.";
          return true;
        }),
    }),
    defineField({
      name: "vegetarianStall",
      title: "Vegetarian stall",
      type: "boolean",
      initialValue: false,
      description: "Turn this on only if the whole stall is vegetarian or jay.",
    }),
    defineField({
      name: "hours",
      title: "Opening hours",
      type: "array",
      of: [defineArrayMember({ type: "openingHours" })],
      description: "Optional. Only add hours when this stall differs from the canteen. Otherwise the canteen hours apply.",
    }),
    defineField({
      name: "mapCell",
      title: "Position on the floor plan",
      type: "object",
      description:
        "Columns and rows count from 0 at the top left of the plan set in Canteen settings. Width and height are in cells.",
      fields: [
        defineField({ name: "col", title: "Column", type: "number", validation: (rule) => rule.required().custom(wholeNumber(0)) }),
        defineField({ name: "row", title: "Row", type: "number", validation: (rule) => rule.required().custom(wholeNumber(0)) }),
        defineField({ name: "w", title: "Width", type: "number", initialValue: 1, validation: (rule) => rule.required().custom(wholeNumber(1)) }),
        defineField({ name: "h", title: "Height", type: "number", initialValue: 1, validation: (rule) => rule.required().custom(wholeNumber(1)) }),
      ],
      options: { columns: 4 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "wayfinding",
      title: "How to find it",
      type: "localeString",
      description: 'Optional. One sentence, for example "Second on the left from the river entrance".',
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "siteImage",
      description: "Optional.",
    }),
  ],
  orderings: [{ title: "Stall number", name: "number", by: [{ field: "number", direction: "asc" }] }],
  preview: {
    select: { title: "name.en", subtitle: "name.th", number: "number" },
    prepare({ title, subtitle, number }: { title?: string; subtitle?: string; number?: number }) {
      return {
        title: `${number ?? "?"}. ${title || "Untitled stall"}`,
        subtitle,
      };
    },
  },
});
