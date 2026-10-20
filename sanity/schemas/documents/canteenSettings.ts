import { defineArrayMember, defineField, defineType } from "sanity";

import { FLOOR_SIDE_OPTIONS } from "../constants";
import { bilingualStringMessage } from "../objects/locale";

function wholeNumber(min: number) {
  return (value: number | undefined): true | string => {
    if (value === undefined) return true;
    if (!Number.isInteger(value)) return "Use a whole number.";
    return value >= min ? true : `Use ${min} or more.`;
  };
}

/**
 * Canteen settings: the floor plan and the jay festival window. There is
 * exactly one of these documents, opened directly from the Canteen group in
 * the desk structure. Registered as schema name `canteenSettings`, matching
 * `_type: "canteenSettings"` on `CanteenSettings` in `lib/sanity/types.ts`.
 *
 * Typical price figures (the median plate of rice and so on) are computed
 * from the dishes, never typed here.
 */
export const canteenSettings = defineType({
  name: "canteenSettings",
  title: "Canteen settings",
  type: "document",
  groups: [
    { name: "place", title: "Place", default: true },
    { name: "plan", title: "Floor plan" },
    { name: "jay", title: "Jay festival" },
  ],
  fields: [
    defineField({
      name: "canteen",
      title: "Canteen place",
      type: "reference",
      to: [{ type: "place" }],
      group: "place",
      description: "The place document for the canteen. Its opening hours apply to every stall that has no hours of its own.",
    }),

    defineField({
      name: "gridCols",
      title: "Plan width (columns)",
      type: "number",
      group: "plan",
      description: "How many columns the floor plan grid has. Stall positions are cells on this grid.",
      validation: (rule) => rule.required().custom(wholeNumber(1)),
    }),
    defineField({
      name: "gridRows",
      title: "Plan height (rows)",
      type: "number",
      group: "plan",
      description: "How many rows the floor plan grid has.",
      validation: (rule) => rule.required().custom(wholeNumber(1)),
    }),
    defineField({
      name: "riverSide",
      title: "River side",
      type: "string",
      group: "plan",
      options: { list: FLOOR_SIDE_OPTIONS, layout: "radio" },
      description: "Optional. Which edge of the plan faces the river, so directions such as \"river entrance\" make sense on the map.",
    }),
    defineField({
      name: "entrances",
      title: "Entrances",
      type: "array",
      group: "plan",
      description: "Where people come in. Routes on the map start from an entrance.",
      of: [
        defineArrayMember({
          type: "object",
          name: "canteenEntrance",
          title: "Entrance",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "localeString",
              validation: (rule) => rule.required().custom(bilingualStringMessage),
            }),
            defineField({ name: "col", title: "Column", type: "number", validation: (rule) => rule.required().custom(wholeNumber(0)) }),
            defineField({ name: "row", title: "Row", type: "number", validation: (rule) => rule.required().custom(wholeNumber(0)) }),
            defineField({
              name: "side",
              title: "Edge of the plan",
              type: "string",
              options: { list: FLOOR_SIDE_OPTIONS, layout: "radio" },
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: "label.en", subtitle: "label.th" } },
        }),
      ],
    }),
    defineField({
      name: "seatingZones",
      title: "Seating zones",
      type: "array",
      group: "plan",
      description: "Areas with tables. Group mode points a group at the zone nearest their stalls.",
      of: [
        defineArrayMember({
          type: "object",
          name: "canteenSeatingZone",
          title: "Seating zone",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "localeString",
              validation: (rule) => rule.required().custom(bilingualStringMessage),
            }),
            defineField({ name: "col", title: "Column", type: "number", validation: (rule) => rule.required().custom(wholeNumber(0)) }),
            defineField({ name: "row", title: "Row", type: "number", validation: (rule) => rule.required().custom(wholeNumber(0)) }),
            defineField({ name: "w", title: "Width", type: "number", initialValue: 1, validation: (rule) => rule.required().custom(wholeNumber(1)) }),
            defineField({ name: "h", title: "Height", type: "number", initialValue: 1, validation: (rule) => rule.required().custom(wholeNumber(1)) }),
          ],
          preview: { select: { title: "label.en", subtitle: "label.th" } },
        }),
      ],
    }),

    defineField({
      name: "jayFestivalStart",
      title: "Jay festival starts",
      type: "date",
      group: "jay",
      description: "Optional. First day of the jay (เจ) festival. Inside the window the canteen section shows a jay banner and suggests the jay filter.",
    }),
    defineField({
      name: "jayFestivalEnd",
      title: "Jay festival ends",
      type: "date",
      group: "jay",
      description: "Optional. Last day of the festival, included. Set both dates or neither.",
      validation: (rule) =>
        rule.custom((end: string | undefined, context) => {
          const start = (context.document as { jayFestivalStart?: string } | undefined)?.jayFestivalStart;
          if (Boolean(start) !== Boolean(end)) return "Set both the start and the end date, or clear both.";
          if (start && end && end < start) return "The end date is before the start date.";
          return true;
        }),
    }),
  ],
  preview: {
    prepare() {
      return { title: "Canteen settings" };
    },
  },
});
