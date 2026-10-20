import { defineArrayMember, defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

/**
 * The taxonomy layer: one document per real-world dish, not per stall.
 * Registered as schema name `canonicalDish`, matching `_type: "canonicalDish"`
 * on `CanonicalDish` in `lib/sanity/types.ts`.
 *
 * Linking each stall's dish to a canonical dish is what makes price
 * comparison across stalls and the "what is this dish" explainer work.
 */
export const canonicalDish = defineType({
  name: "canonicalDish",
  title: "Canonical dish",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "localeString",
      description: 'The dish in general, not one stall\'s version. For example "ข้าวกะเพรา" and "Holy basil stir-fry over rice".',
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
      name: "aliases",
      title: "Other spellings",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      description: "Optional. Spellings people search for, for example krapow, kaprao, gaprao, กะเพา. Search uses these.",
    }),
    defineField({
      name: "explainer",
      title: "What it is",
      type: "localeText",
      description: "Optional. Explain the dish to someone who has never had it. Plain facts, no allergen claims.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "howToOrder",
      title: "How to order",
      type: "array",
      description: 'Optional. Phrases a student can show or say at the stall, for example "ไม่เผ็ด, mai phet, not spicy".',
      of: [
        defineArrayMember({
          type: "object",
          name: "orderPhrase",
          title: "Phrase",
          fields: [
            defineField({ name: "th", title: "Thai", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "romanised", title: "Romanised", type: "string", validation: (rule) => rule.required() }),
            defineField({ name: "en", title: "Meaning in English", type: "string", validation: (rule) => rule.required() }),
          ],
          preview: {
            select: { title: "th", subtitle: "en" },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "name.en", subtitle: "name.th" },
  },
});
