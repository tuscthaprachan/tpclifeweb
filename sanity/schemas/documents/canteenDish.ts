import { defineArrayMember, defineField, defineType } from "sanity";

import {
  COOKING_STYLE_OPTIONS,
  DISH_COURSE_OPTIONS,
  DISH_TYPE_OPTIONS,
  PROTEIN_OPTIONS,
  ALLERGEN_OPTIONS,
  TEMPERATURE_OPTIONS,
} from "../constants";
import { bilingualStringMessage } from "../objects/locale";

function priceMessage(value: number | undefined): true | string {
  if (value === undefined) return true;
  if (!Number.isInteger(value)) return "Use a whole number of baht.";
  return value >= 1 ? true : "The price must be at least 1 baht.";
}

/**
 * One dish at one stall. Registered as schema name `canteenDish`, matching
 * `_type: "canteenDish"` on `CanteenDish` in `lib/sanity/types.ts`.
 *
 * Allergens are a broad guess ("contains"), and there is no field for
 * whether the dish is sold out today. This is a surveyed record of what the stall sells and
 * what it cost on the day it was checked.
 */
export const canteenDish = defineType({
  name: "canteenDish",
  title: "Canteen dish",
  type: "document",
  groups: [
    { name: "basics", title: "Basics", default: true },
    { name: "tags", title: "Tags" },
    { name: "price", title: "Price" },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "localeString",
      group: "basics",
      description:
        'The Thai exactly as the stall writes it on the board. The English is a plain description with the Thai transliteration, for example "Stir-fried holy basil with pork (pad kra pao moo)". Do not invent a name.',
      validation: (rule) => rule.required().custom(bilingualStringMessage),
    }),
    defineField({
      name: "romanised",
      title: "How to say it",
      type: "string",
      description: 'The Thai name in Latin letters (RTGS, no tone marks), for example "khao phat kai". Shown on English pages with a button that reads the Thai aloud.',
    }),
    defineField({
      name: "menuNumber",
      title: "Number on the board",
      type: "string",
      description: "Optional. The number the stall's board gives this dish, if it numbers its menu.",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "basics",
      options: { source: (doc: Record<string, unknown>) => (doc.name as { en?: string } | undefined)?.en ?? "" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "stall",
      title: "Stall",
      type: "reference",
      to: [{ type: "canteenStall" }],
      group: "basics",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "canonical",
      title: "Canonical dish",
      type: "reference",
      to: [{ type: "canonicalDish" }],
      group: "basics",
      description:
        "Strongly encouraged. Linking the dish to its general name lets students compare the same dish across stalls.",
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "siteImage",
      group: "basics",
      description: "Optional.",
    }),

    defineField({
      name: "type",
      title: "Type",
      type: "string",
      group: "tags",
      options: { list: DISH_TYPE_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "course",
      title: "Course",
      type: "string",
      group: "tags",
      options: { list: DISH_COURSE_OPTIONS, layout: "radio" },
      description: "Main, side, drink or dessert. The meal budget tool builds a combo from one main plus an optional drink and dessert.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "protein",
      title: "Protein",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      group: "tags",
      options: { list: PROTEIN_OPTIONS },
      description:
        'Every protein in the dish as normally made. Pick "None" if there is no meat, fish, egg or tofu. This drives the "no pork" and "avoid" filters, which are preferences and not allergy tools.',
      validation: (rule) =>
        rule.required().min(1).error('Pick at least one protein, or "None".').custom((value: string[] | undefined) => {
          if (value && value.includes("none") && value.length > 1) {
            return 'Remove "None", or remove the other proteins.';
          }
          return true;
        }),
    }),
    defineField({
      name: "contains",
      title: "Probably contains",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      group: "tags",
      options: { list: ALLERGEN_OPTIONS },
      description:
        "Allergens the dish probably contains as normally made, sauces, pastes and batter included (fish sauce, soy sauce, shrimp paste, wheat flour). Err towards ticking. Drives the leave-out filters, which are never allergy-safe.",
    }),
    defineField({
      name: "style",
      title: "Cooking style",
      type: "string",
      group: "tags",
      options: { list: COOKING_STYLE_OPTIONS },
    }),
    defineField({
      name: "temperature",
      title: "Hot or cold",
      type: "string",
      group: "tags",
      options: { list: TEMPERATURE_OPTIONS, layout: "radio" },
      initialValue: "hot",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "wet",
      title: "Soupy or with sauce",
      type: "boolean",
      group: "tags",
      initialValue: false,
    }),
    defineField({
      name: "vegetarian",
      title: "Vegetarian",
      type: "boolean",
      group: "tags",
      initialValue: false,
      description: "On if it is normally made without meat, fish or seafood. Only mains show the vegetarian tag.",
    }),

    defineField({
      name: "price",
      title: "Price (baht)",
      type: "number",
      group: "price",
      description: "The base price as read off the board.",
      validation: (rule) => rule.required().custom(priceMessage),
    }),
    defineField({
      name: "variants",
      title: "Price variants",
      type: "array",
      group: "price",
      description: 'Optional. For example "special (พิเศษ)" adds 10, "add egg" adds 10.',
      of: [
        defineArrayMember({
          type: "object",
          name: "dishVariant",
          title: "Variant",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "localeString",
              validation: (rule) => rule.required().custom(bilingualStringMessage),
            }),
            defineField({
              name: "delta",
              title: "Extra baht",
              type: "number",
              validation: (rule) =>
                rule.required().custom((value: number | undefined) => {
                  if (value === undefined) return true;
                  if (!Number.isInteger(value) || value < 0) return "Use a whole number of baht, zero or more.";
                  return true;
                }),
            }),
          ],
          preview: {
            select: { title: "label.en", subtitle: "delta" },
            prepare({ title, subtitle }: { title?: string; subtitle?: number }) {
              return { title: title || "Variant", subtitle: subtitle === undefined ? undefined : `+${subtitle} baht` };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "checkedOn",
      title: "Price checked on",
      type: "date",
      group: "price",
      description: "The day the price was last read off the board. Shown to students beside every price.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "priceHistory",
      title: "Price history",
      type: "array",
      group: "price",
      description:
        "Append only. When the price changes, add a new entry and keep the old ones. Never edit or delete an earlier entry, it is the evidence for the price tracker.",
      of: [
        defineArrayMember({
          type: "object",
          name: "priceRecord",
          title: "Price record",
          fields: [
            defineField({
              name: "price",
              title: "Price (baht)",
              type: "number",
              validation: (rule) => rule.required().custom(priceMessage),
            }),
            defineField({
              name: "checkedOn",
              title: "Checked on",
              type: "date",
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: "price", subtitle: "checkedOn" },
            prepare({ title, subtitle }: { title?: number; subtitle?: string }) {
              return { title: title === undefined ? "Price" : `${title} baht`, subtitle };
            },
          },
        }),
      ],
      validation: (rule) =>
        rule.custom((history: Array<{ price?: number; checkedOn?: string }> | undefined, context) => {
          if (!history || history.length === 0) return true;
          const price = (context.document as { price?: number } | undefined)?.price;
          const latest = [...history].sort((a, b) => (a.checkedOn ?? "").localeCompare(b.checkedOn ?? "")).at(-1);
          if (price !== undefined && latest?.price !== undefined && latest.price !== price) {
            return "The newest history entry does not match the price above. Add an entry for the current price.";
          }
          return true;
        }).warning(),
    }),
    defineField({
      name: "lastReviewed",
      title: "Last reviewed",
      type: "date",
      group: "price",
      description:
        "The date an editor last checked this dish is still correct. Leave it blank on imported dishes until someone has walked the record.",
    }),
  ],
  orderings: [
    { title: "Name (English)", name: "nameEn", by: [{ field: "name.en", direction: "asc" }] },
    { title: "Price checked, oldest first", name: "checkedOnAsc", by: [{ field: "checkedOn", direction: "asc" }] },
  ],
  preview: {
    select: { title: "name.en", subtitle: "name.th", price: "price", checkedOn: "checkedOn" },
    prepare({ title, subtitle, price, checkedOn }: { title?: string; subtitle?: string; price?: number; checkedOn?: string }) {
      return {
        title: title || "Untitled dish",
        subtitle: `${price === undefined ? "No price" : `${price} baht`}${checkedOn ? `, checked ${checkedOn}` : ", not checked"}${subtitle ? `, ${subtitle}` : ""}`,
      };
    },
  },
});
