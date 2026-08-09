import { defineArrayMember, defineField, defineType } from "sanity";

import { bilingualStringMessage, bilingualStringMessageOptional } from "../objects/locale";

const TYPE_OPTIONS = [
  { title: "Faculty committee", value: "facultyCommittee" },
  { title: "Club", value: "club" },
  { title: "Independent group", value: "independentGroup" },
  { title: "University division", value: "universityDivision" },
  { title: "Student body", value: "studentBody" },
];

/**
 * A club, faculty committee, independent group, university division, or one
 * of the two student bodies. Source real organisations from
 * `data/harvested-inventory.ts`, do not invent one.
 */
export const organisation = defineType({
  name: "organisation",
  title: "Organisation",
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
      name: "type",
      title: "Type",
      type: "string",
      options: { list: TYPE_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "faculty",
      title: "Faculty",
      type: "localeString",
      description: "Optional. Only relevant for a faculty committee.",
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
      name: "contacts",
      title: "Contacts",
      type: "array",
      of: [defineArrayMember({ type: "organisationContact" })],
      description: "How students actually reach this organisation. Most run entirely on Instagram.",
      validation: (rule) => rule.required().min(1).error("Add at least one real contact channel."),
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "localeString",
      description: "Optional. Where this organisation is usually found on campus.",
      validation: (rule) => rule.custom(bilingualStringMessageOptional),
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
      description: "Turn this off rather than deleting the record if the organisation is no longer running.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "name.en", subtitle: "type" },
  },
});
